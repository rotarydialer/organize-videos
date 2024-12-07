const fs = require('fs-extra');
const path = require('path');
const readline = require('readline');
const { exiftool } = require('exiftool-vendored');

// usage:
// node organize /media/user/family/pictures/Cell\ Phones/iPhone\ 5/Camera /media/user/family/video/Cell\ phones/organized

const logFileName = `organize-plan-${new Date().toISOString().split('T')[0]}.log`;

async function getMetadata(file) {
  try {
    const metadata = await exiftool.read(file);
    const rawDate = metadata.CreateDate || metadata.DateTimeOriginal;
    if (!rawDate) return null;

    const parsedDate = new Date(rawDate);

    // Ensure the parsed date is valid
    if (isNaN(parsedDate)) {
      console.error(`Invalid date format for file: ${file}`);
      return null;
    }

    return parsedDate;
  } catch (error) {
    console.error(`Error reading metadata for ${file}:`, error.message);
    return null;
  }
}


async function organizeVideos(sourceDir, destDir) {
  const alreadyThere = [];
  const toBeCopied = [];
  const copyErrors = [];

  const files = (await fs.readdir(sourceDir)).filter(file => /\.(mp4|mov|avi|mkv|wmv|flv|webm)$/i.test(file));

  for (const file of files) {
    const sourcePath = path.join(sourceDir, file);
    const stats = await fs.stat(sourcePath);

    if (stats.isDirectory()) continue; // skip directories

    const metadataDate = await getMetadata(sourcePath);

    if (!metadataDate) {
      console.log(`Skipping ${file}: No date metadata available.`);
      continue;
    }

    const year = metadataDate.getFullYear();
    const month = String(metadataDate.getMonth() + 1).padStart(2, '0');
    const destSubDir = path.join(destDir, `${year}`, `${month}`);
    const destPath = path.join(destSubDir, file);

    if (await fs.pathExists(destPath)) {
      const sourceSize = stats.size;
      const destSize = (await fs.stat(destPath)).size;
      if (sourceSize === destSize) {
        alreadyThere.push({ sourcePath, destPath });
      } else {
        console.log(`Conflict: ${file} exists but differs in size.`);
        copyErrors.push({ sourcePath, destPath });
      }
    } else {
      toBeCopied.push({ sourcePath, destPath });
    }
  }

  // Write results to a log file
  const now = new Date();
  const logFileName = `organize-plan-${now.toISOString().replace(/:/g, '-').split('.')[0]}.log`;

  const logFilePath = path.join(destDir, logFileName);

  let logContent = `Log created on ${new Date().toISOString()}\n\n`;

  logContent += `Source: ${sourceDir}\n`;
  logContent += `Destination: ${sourceDir}\n\n`;

  logContent += `\nTo be copied (${toBeCopied.length} files):\n`;
  toBeCopied.forEach(({ sourcePath, destPath }) => {
    logContent += `- Source: ${sourcePath}\n  Destination: ${destPath}\n`;
  });
  logContent += `\nErrors/conflicts (${copyErrors.length} files):\n`;
  copyErrors.forEach(({ sourcePath, destPath }) => {
    logContent += `- Source: ${sourcePath}\n  Destination: ${destPath}\n`;
  });
  logContent += `\nAlready there (${alreadyThere.length} files):\n`;
  alreadyThere.forEach(({ sourcePath, destPath }) => {
    logContent += `- Source: ${sourcePath}\n  Destination: ${destPath}\n`;
  });

  // Write log to file
  fs.writeFileSync(logFilePath, logContent);
  console.log(`Comparison results saved to ${logFilePath}`);

  return { alreadyThere, toBeCopied, copyErrors };
}

function promptUser(question) {
  const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout,
  });

  return new Promise((resolve) => {
    rl.question(question, (answer) => {
      rl.close();
      resolve(answer.trim().toLowerCase() === 'y');
    });
  });
}

async function copyFiles(toBeCopied, logFilePath) {
  for (const { sourcePath, destPath } of toBeCopied) {
    console.log(`Copying ${sourcePath} -> ${destPath}`);
    const destDir = path.dirname(destPath);
    await fs.ensureDir(destDir);
    await fs.copy(sourcePath, destPath);
    fs.appendFileSync(logFilePath, `Copied: ${sourcePath} -> ${destPath}\n`);
  }
}

async function main() {
  const sourceDir = path.resolve(process.argv[2]);
  const destDir = path.resolve(process.argv[3]);

  if (!sourceDir || !destDir) {
    console.error('Usage: node organize.js <source_directory> <destination_directory>');
    process.exit(1);
  }

  if (!(await fs.pathExists(sourceDir))) {
    console.error(`Error: Source directory "${sourceDir}" does not exist.`);
    process.exit(1);
  }

  if (!(await fs.pathExists(destDir))) {
    console.error(`Error: Destination directory "${destDir}" does not exist.`);
    process.exit(1);
  }

  console.log('Scanning files and comparing...');
  const { alreadyThere, toBeCopied, copyErrors } = await organizeVideos(sourceDir, destDir);

  console.log(`\nSummary:`);
  console.log(`  Already there: ${alreadyThere.length} file(s)`);
  console.log(`  To be copied: ${toBeCopied.length} file(s)`);
  console.log(`  Errors/conflicts: ${copyErrors.length} file(s)`);

  if (toBeCopied.length === 0) {
    console.log('No files to copy.');
    process.exit(0);
  }

  const now = new Date();
  const logFilePath = path.join(destDir, `organized-results_${now.toISOString().replace(/:/g, '-').split('.')[0]}.log`);
  fs.writeFileSync(logFilePath, `Log created on ${new Date().toISOString()}\n\n`);

  const userConfirmed = await promptUser('Do you wish to copy these files? (Y/N): ');
  if (userConfirmed) {
    await copyFiles(toBeCopied, logFilePath);
    console.log(`Operation completed. Log saved to ${logFilePath}`);
  } else {
    console.log('Operation canceled.');
  }

  exiftool.end();
}


main().catch((err) => {
  console.error('Error:', err);
  process.exit(1);
});
