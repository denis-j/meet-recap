# Meeting Recorder & Summarizer

A desktop application that records meetings (screen and audio) and uses AI to generate meeting summaries.

## Features

- Record your screen and audio during meetings
- Automatically transcribe meeting audio using OpenAI's Whisper
- Generate concise summaries using OpenAI's GPT-4
- View and save transcripts and summaries
- Local processing - your recordings stay on your computer

## Requirements

- Node.js (v14+)
- OpenAI API key for transcription and summarization

## Getting Started

1. Clone this repository
2. Install dependencies:
   ```
   npm install
   ```
3. Start the application:
   ```
   npm run dev
   ```

## Usage

1. Launch the application
2. Enter your OpenAI API key (only sent to OpenAI servers)
3. Click "Start Recording" to choose which screen/window to record
4. Record your meeting
5. Click "Stop Recording" when finished
6. Save the recording file when prompted
7. Wait for the application to process the recording
8. View the transcript and summary

## Building for Distribution

To build the application for distribution:

```
npm run dist
```

This will create distributable packages in the `dist` folder.

## Privacy

Your meetings are recorded locally on your computer. Audio is sent to OpenAI only for transcription purposes. No data is permanently stored on any remote servers except as necessary for the OpenAI API to process your request. # meet-recap
