'use client';

import { useRef, useState, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useTheme } from '@/contexts/ThemeContext';
import { THEMES, type ThemeId } from '@/lib/themes';

interface ThemeSwitcherProps {
  open: boolean;
  onClose: () => void;
}

const MAX_FILE_BYTES = 500 * 1024; // 500 KB
const ALLOWED_TYPES = ['image/jpeg', 'image/png', 'image/webp', 'image/gif'];

export default function ThemeSwitcher({ open, onClose }: ThemeSwitcherProps) {
  const { themeId, setThemeId, customCardBack, setCustomCardBack } = useTheme();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const [previewPending, setPreviewPending] = useState(false);

  const handleFileChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      setUploadError(null);
      const file = e.target.files?.[0];
      if (!file) return;

      if (!ALLOWED_TYPES.includes(file.type)) {
        setUploadError('Only JPG, PNG, WebP, or GIF files are allowed.');
        return;
      }
      if (file.size > MAX_FILE_BYTES) {
        setUploadError('File must be under 500 KB.');
        return;
      }

      setPreviewPending(true);
      const reader = new FileReader();
      reader.onload = ev => {
        const result = ev.target?.result as string;
        setCustomCardBack(result);
        setPreviewPending(false);
      };
      reader.readAsDataURL(file);
      // Reset the input so re-selecting the same file triggers onChange
      e.target.value = '';
    },
    [setCustomCardBack]
  );

  return (
    <AnimatePresence>
      {open && (
        <>
          {/* Backdrop */}
          <motion.div
            key="backdrop"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm"
            onClick={onClose}
          />

          {/* Drawer */}
          <motion.div
            key="drawer"
            initial={{ y: '100%' }}
            animate={{ y: 0 }}
            exit={{ y: '100%' }}
            transition={{ type: 'spring', stiffness: 350, damping: 35 }}
            className="fixed bottom-0 left-0 right-0 z-50 rounded-t-3xl overflow-hidden"
            style={{
              background: 'linear-gradient(165deg, rgba(31, 24, 59, 0.97), rgba(13, 10, 27, 0.99))',
              border: '1px solid rgba(255,255,255,0.08)',
              borderBottom: 'none',
              boxShadow: '0 -24px 60px rgba(0,0,0,0.7)',
              maxHeight: '90dvh',
              overflowY: 'auto',
            }}
          >
            {/* Handle bar */}
            <div className="flex justify-center pt-3 pb-1">
              <div className="w-10 h-1 rounded-full bg-white/20" />
            </div>

            <div className="px-5 pb-10 pt-2 md:px-8 md:max-w-2xl md:mx-auto">
              {/* Header */}
              <div className="flex items-center justify-between mb-6">
                <div>
                  <h2 className="display-font text-2xl text-white">Deck Themes</h2>
                  <p className="text-xs text-text-muted mt-0.5">
                    Changes apply instantly — no reload needed
                  </p>
                </div>
                <button
                  onClick={onClose}
                  className="w-9 h-9 rounded-full flex items-center justify-center text-text-muted hover:text-text hover:bg-white/10 transition-colors"
                  aria-label="Close"
                >
                  ✕
                </button>
              </div>

              {/* Theme Grid */}
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 mb-8">
                {THEMES.map(theme => {
                  const isActive = themeId === theme.id && !theme.premium;
                  return (
                    <motion.button
                      key={theme.id}
                      whileHover={!theme.premium ? { scale: 1.03, y: -2 } : undefined}
                      whileTap={!theme.premium ? { scale: 0.97 } : undefined}
                      onClick={!theme.premium ? () => setThemeId(theme.id as ThemeId) : undefined}
                      disabled={theme.premium}
                      className={`relative rounded-2xl p-3 text-left transition-all overflow-hidden
                        ${theme.premium ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}
                      `}
                      style={{
                        background: isActive
                          ? `linear-gradient(135deg, ${theme.variables['--color-surface-light']}, ${theme.variables['--color-surface']})`
                          : `linear-gradient(135deg, rgba(31,24,59,0.6), rgba(13,10,27,0.8))`,
                        border: isActive
                          ? `2px solid ${theme.variables['--color-accent']}`
                          : '2px solid rgba(255,255,255,0.06)',
                        boxShadow: isActive
                          ? `0 0 16px ${theme.variables['--color-accent']}44`
                          : 'none',
                      }}
                    >
                      {/* Premium lock */}
                      {theme.premium && (
                        <span className="absolute top-2 right-2 text-xs">🔒</span>
                      )}

                      {/* Mini card back preview */}
                      <div
                        className="w-10 h-14 rounded-lg mb-2 flex items-center justify-center text-lg shadow-md"
                        style={{
                          background: theme.cardBack.background,
                          border: `1px solid ${theme.cardBack.border}`,
                        }}
                      >
                        {theme.cardBack.emoji}
                      </div>

                      <div className="flex items-center gap-1.5 mb-0.5">
                        <span className="text-sm">{theme.emoji}</span>
                        <span
                          className="text-xs font-black uppercase tracking-wider"
                          style={{ color: isActive ? theme.variables['--color-accent'] : '#f0f0f0' }}
                        >
                          {theme.name}
                        </span>
                      </div>
                      <p className="text-[10px] text-text-muted leading-snug">{theme.description}</p>

                      {isActive && (
                        <motion.div
                          layoutId="theme-active-ring"
                          className="absolute inset-0 rounded-2xl pointer-events-none"
                          style={{
                            boxShadow: `inset 0 0 0 2px ${theme.variables['--color-accent']}66`,
                          }}
                        />
                      )}
                    </motion.button>
                  );
                })}
              </div>

              {/* Custom Card Back */}
              <div className="rounded-2xl p-4 mb-2" style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)' }}>
                <h3 className="text-sm font-black uppercase tracking-wider text-text mb-1 flex items-center gap-2">
                  🖼️ Custom Card Back
                  <span className="text-[10px] font-normal text-text-muted normal-case tracking-normal">
                    JPG / PNG / WebP / GIF · max 500 KB
                  </span>
                </h3>
                <p className="text-xs text-text-muted mb-3">
                  Upload your own image to use as the card back for face-down cards.
                </p>

                <div className="flex items-center gap-3">
                  {/* Preview */}
                  {customCardBack ? (
                    <div
                      className="w-12 h-[68px] rounded-xl flex-shrink-0 overflow-hidden shadow-lg"
                      style={{ border: '1px solid rgba(255,255,255,0.15)' }}
                    >
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img
                        src={customCardBack}
                        alt="Custom card back"
                        className="w-full h-full object-cover"
                      />
                    </div>
                  ) : (
                    <div
                      className="w-12 h-[68px] rounded-xl flex-shrink-0 flex items-center justify-center text-xl"
                      style={{
                        background: 'rgba(255,255,255,0.04)',
                        border: '1px dashed rgba(255,255,255,0.15)',
                      }}
                    >
                      🃏
                    </div>
                  )}

                  <div className="flex-1 flex flex-col gap-2">
                    <motion.button
                      whileHover={{ scale: 1.02 }}
                      whileTap={{ scale: 0.97 }}
                      onClick={() => fileInputRef.current?.click()}
                      disabled={previewPending}
                      className="py-2.5 px-4 rounded-xl text-sm font-bold text-white transition-all"
                      style={{
                        background: 'linear-gradient(135deg, #7c3aed, #4f46e5)',
                        boxShadow: '0 4px 12px rgba(124,58,237,0.3)',
                      }}
                    >
                      {previewPending ? 'Loading…' : customCardBack ? 'Change Image' : 'Upload Image'}
                    </motion.button>

                    {customCardBack && (
                      <button
                        onClick={() => setCustomCardBack(null)}
                        className="py-2 px-4 rounded-xl text-xs font-bold text-text-muted hover:text-text transition-colors"
                        style={{ background: 'rgba(255,255,255,0.05)' }}
                      >
                        Remove Custom Back
                      </button>
                    )}
                  </div>
                </div>

                {uploadError && (
                  <p className="text-xs text-danger mt-2 font-semibold">{uploadError}</p>
                )}

                <input
                  ref={fileInputRef}
                  type="file"
                  accept={ALLOWED_TYPES.join(',')}
                  className="hidden"
                  onChange={handleFileChange}
                />
              </div>

              {/* Premium teaser */}
              <p className="text-center text-[10px] text-text-muted mt-3">
                🔒 Premium themes coming soon — support development to unlock exclusive skins
              </p>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}
