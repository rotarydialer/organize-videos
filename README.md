# organize-videos
Simple scripts to make consolidating and organizing video files easier.

## Usage

Run against a source directory containing videos and specify a destination directory where you wish the organized results to be copied to. The script will use videos' metadata to sort them into dated folders in the destination.

```
$ node organize ~/pictures/Pixel/Camera ~/videos/organized

Scanning files and comparing...
Comparison results saved to ~/videos/organized/organize-plan-2024-12-06T22-45-05.log

Summary:
  Already there: 0 file(s)
  To be copied: 120 file(s)
  Errors/conflicts: 0 file(s)
Do you wish to copy these files? (Y/N): y

Copying ~/pictures/iPhone/IMG_0057.MOV -> ~/videos/organized/2013/04/IMG_0057.MOV
Copying ~/pictures/iPhone/IMG_0069.MOV -> ~/videos/organized/2013/04/IMG_0069.MOV
Copying ~/pictures/iPhone/IMG_0170.MOV -> ~/videos/organized/2013/05/IMG_0170.MOV
...

Operation completed. Log saved to ~/videos/organized/organized-results_2024-12-06T22-45-05.log

```