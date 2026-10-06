import { NextResponse } from 'next/server';
import fs from 'fs';
import path from 'path';
import { INITIAL_NOTES } from '../../../utils/initialData';
import { DEFAULT_FOLDERS } from '../../../utils/colors';

const DATA_DIR = path.join(process.cwd(), 'data');
const NOTES_FILE = path.join(DATA_DIR, 'notes.json');
const FOLDERS_FILE = path.join(DATA_DIR, 'folders.json');

function ensureData() {
  if (!fs.existsSync(DATA_DIR)) {
    fs.mkdirSync(DATA_DIR, { recursive: true });
  }
  if (!fs.existsSync(NOTES_FILE)) {
    fs.writeFileSync(NOTES_FILE, JSON.stringify(INITIAL_NOTES, null, 2), 'utf-8');
  }
  if (!fs.existsSync(FOLDERS_FILE)) {
    fs.writeFileSync(FOLDERS_FILE, JSON.stringify(DEFAULT_FOLDERS, null, 2), 'utf-8');
  }
}

export async function GET() {
  ensureData();
  try {
    const notes = JSON.parse(fs.readFileSync(NOTES_FILE, 'utf-8'));
    const folders = JSON.parse(fs.readFileSync(FOLDERS_FILE, 'utf-8'));
    return NextResponse.json({ success: true, notes, folders });
  } catch (error) {
    return NextResponse.json({ success: false, error: 'Veri okunamadı' }, { status: 500 });
  }
}

export async function POST(request: Request) {
  ensureData();
  try {
    const body = await request.json();
    const { action, note, folder, noteId } = body;

    let notes = JSON.parse(fs.readFileSync(NOTES_FILE, 'utf-8'));
    let folders = JSON.parse(fs.readFileSync(FOLDERS_FILE, 'utf-8'));

    if (action === 'save_note' && note) {
      const idx = notes.findIndex((n: any) => n.id === note.id);
      if (idx !== -1) {
        notes[idx] = note;
      } else {
        notes.unshift(note);
      }
      fs.writeFileSync(NOTES_FILE, JSON.stringify(notes, null, 2), 'utf-8');
      return NextResponse.json({ success: true, note });
    }

    if (action === 'delete_note' && noteId) {
      notes = notes.filter((n: any) => n.id !== noteId);
      fs.writeFileSync(NOTES_FILE, JSON.stringify(notes, null, 2), 'utf-8');
      return NextResponse.json({ success: true });
    }

    return NextResponse.json({ success: false, error: 'Geçersiz işlem' }, { status: 400 });
  } catch (error) {
    return NextResponse.json({ success: false, error: 'İşlem başarısız' }, { status: 500 });
  }
}
