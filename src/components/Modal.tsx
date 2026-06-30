/**
 * Desenvolvido por José Felipe A. Barroso (pixdobarroso@gmail.com)
 */

import React from 'react';
import {X} from 'lucide-react';
import {motion, AnimatePresence} from 'motion/react';
import {cn} from '../lib/utils';

interface ModalProps {
  isOpen: boolean;
  onClose: () => void;
  title: string;
  children: React.ReactNode;
  footer?: React.ReactNode;
  className?: string;
}

export function Modal({isOpen, onClose, title, children, footer, className}: ModalProps) {
  return (
    <AnimatePresence>
      {isOpen && (
        <>
          <motion.div
            initial={{opacity: 0}}
            animate={{opacity: 1}}
            exit={{opacity: 0}}
            onClick={onClose}
            className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm z-50 transition-opacity"
          />
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 pointer-events-none">
            <motion.div
              initial={{opacity: 0, scale: 0.95, translateY: 10}}
              animate={{opacity: 1, scale: 1, translateY: 0}}
              exit={{opacity: 0, scale: 0.95, translateY: 10}}
              className={cn(
                "bg-white rounded-2xl shadow-2xl w-full max-w-md pointer-events-auto flex flex-col overflow-hidden max-h-[calc(100vh-2rem)] md:max-h-[calc(100vh-4rem)]",
                className
              )}
            >
              <div className="px-6 py-4 border-b border-gray-100 flex items-center justify-between bg-gray-50/50 shrink-0">
                <h3 className="font-bold text-slate-800 tracking-tight">{title}</h3>
                <button 
                  onClick={onClose}
                  className="p-1 hover:bg-gray-200 rounded-lg transition-colors text-gray-400 hover:text-gray-600"
                >
                  <X size={20} />
                </button>
              </div>
              
              <div className="p-6 overflow-y-auto flex-1">
                {children}
              </div>

              {footer && (
                <div className="px-6 py-4 border-t border-gray-100 bg-gray-50/50 flex justify-end gap-3 shrink-0">
                  {footer}
                </div>
              )}
            </motion.div>
          </div>
        </>
      )}
    </AnimatePresence>
  );
}

interface ConfirmModalProps extends Omit<ModalProps, 'children' | 'footer'> {
  message: string;
  confirmLabel?: string;
  cancelLabel?: string;
  onConfirm: () => void;
  variant?: 'danger' | 'primary';
}

export function ConfirmModal({
  isOpen, 
  onClose, 
  title, 
  message, 
  onConfirm, 
  confirmLabel = "Confirmar", 
  cancelLabel = "Cancelar",
  variant = 'primary'
}: ConfirmModalProps) {
  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={title}
      footer={
        <>
          <button 
            onClick={onClose}
            className="px-4 py-2 text-sm font-semibold text-gray-600 hover:bg-gray-200 rounded-xl transition-colors"
          >
            {cancelLabel}
          </button>
          <button 
            onClick={() => {
              onConfirm();
              onClose();
            }}
            className={cn(
              "px-5 py-2 rounded-xl text-sm font-semibold shadow-sm transition-all active:scale-95",
              variant === 'danger' ? "bg-red-600 text-white hover:bg-red-700" : "bg-blue-600 text-white hover:bg-blue-700"
            )}
          >
            {confirmLabel}
          </button>
        </>
      }
    >
      <p className="text-gray-600 text-sm leading-relaxed">{message}</p>
    </Modal>
  );
}
