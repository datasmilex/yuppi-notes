'use client';

import { useCallback, useEffect, useRef } from 'react';
import { useNotes } from '../../context/NotesContext';
import { useUI } from '../../context/UIContext';
import { useToast } from './Toast';
import { htmlToPlainText } from '../../utils/text';
import { playChime, readFiredReminders, showSystemNotification, writeFiredReminders } from '../../utils/reminders';

const CHECK_INTERVAL = 15_000;

/**
 * Zamanı gelen hatırlatıcılar için uygulama içi bildirim + (izin varsa) sistem bildirimi gösterir.
 * Hangi hatırlatıcının çalındığı cihazda tutulur; zaman değiştirilirse yeniden çalar.
 */
export const ReminderWatcher: React.FC = () => {
  const { notes, hydrated, openNoteById } = useNotes();
  const { prefs } = useUI();
  const { showToast } = useToast();

  const notesRef = useRef(notes);
  notesRef.current = notes;
  const soundRef = useRef(prefs.reminderSound);
  soundRef.current = prefs.reminderSound;

  const check = useCallback(() => {
    const now = Date.now();
    const due = notesRef.current.filter((n) => n.reminderAt && !n.deletedAt && n.reminderAt <= now);
    if (due.length === 0) return;

    const fired = readFiredReminders();
    const fresh = due.filter((n) => fired[n.id] !== n.reminderAt);
    if (fresh.length === 0) return;

    fresh.forEach((note) => {
      fired[note.id] = note.reminderAt as number;
      const title = note.title || 'Başlıksız Not';
      const body = htmlToPlainText(note.content).slice(0, 120) || 'Hatırlatıcının zamanı geldi.';
      showToast(`⏰ Hatırlatıcı: ${title}`, 'info', {
        icon: '⏰',
        duration: 12_000,
        action: { label: 'Aç', onClick: () => openNoteById(note.id) },
      });
      if (document.visibilityState === 'hidden' || !document.hasFocus()) {
        showSystemNotification(`⏰ ${title}`, body, () => openNoteById(note.id));
      }
    });

    // Artık var olmayan notların kayıtlarını temizle
    const ids = new Set(notesRef.current.map((n) => n.id));
    Object.keys(fired).forEach((id) => {
      if (!ids.has(id)) delete fired[id];
    });
    writeFiredReminders(fired);
    if (soundRef.current) playChime();
  }, [openNoteById, showToast]);

  useEffect(() => {
    if (hydrated) check();
  }, [hydrated, notes, check]);

  useEffect(() => {
    if (!hydrated) return;
    const timer = setInterval(check, CHECK_INTERVAL);
    const onVisible = () => {
      if (document.visibilityState === 'visible') check();
    };
    document.addEventListener('visibilitychange', onVisible);
    return () => {
      clearInterval(timer);
      document.removeEventListener('visibilitychange', onVisible);
    };
  }, [hydrated, check]);

  return null;
};
