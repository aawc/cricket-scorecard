/**
 * Universal Modal Controller for Cricket Scorecard PWA.
 * Provides accessible, zero-dependency modal open/close functionality
 * that works seamlessly both with Bootstrap 5 JS (when present) and via native
 * DOM manipulation when external CDN scripts fail to load or when offline.
 *
 * Guarantees strict W3C WAI-ARIA compliance and prevents Chromium's
 * "Blocked aria-hidden on an element because its descendant retained focus" error.
 */

let activeBackdrops: HTMLElement[] = [];
const onModalHiddenCallbacks: Map<HTMLElement, Array<() => void>> = new Map();

export function getModalElement(target: HTMLElement | string): HTMLElement | null {
    if (typeof target === 'string') {
        const cleanId = target.startsWith('#') ? target.slice(1) : target;
        return document.getElementById(cleanId);
    }
    return target;
}

export function registerModalHiddenCallback(modalTarget: HTMLElement | string, callback: () => void): void {
    const modalEl = getModalElement(modalTarget);
    if (!modalEl) return;
    const existing = onModalHiddenCallbacks.get(modalEl) || [];
    existing.push(callback);
    onModalHiddenCallbacks.set(modalEl, existing);
}

export function openModal(modalTarget: HTMLElement | string, triggerEl?: HTMLElement | null): void {
    if (typeof document === 'undefined') return;

    const modalEl = getModalElement(modalTarget);
    if (!modalEl) return;

    // Record the element that triggered the modal for focus restoration on close
    const trigger = triggerEl || (document.activeElement as HTMLElement | null);
    (modalEl as any)._triggerElement = trigger;

    // Delegate to Bootstrap if available
    if (typeof window !== 'undefined' && (window as any).bootstrap && (window as any).bootstrap.Modal) {
        try {
            const instance = (window as any).bootstrap.Modal.getOrCreateInstance(modalEl);
            instance.show();
        } catch (e) {
            console.warn('[Modal] Bootstrap show failed, using native fallback:', e);
            nativeShowModal(modalEl);
        }
    } else {
        nativeShowModal(modalEl);
    }

    // Accessible focus management: focus the first interactive element inside the modal
    setTimeout(() => {
        if (!modalEl.isConnected) return;
        const focusable = modalEl.querySelector(
            'textarea:not([disabled]), input:not([disabled]), select:not([disabled]), button:not([disabled]):not(.btn-close)'
        ) as HTMLElement | null;
        if (focusable && typeof focusable.focus === 'function') {
            focusable.focus();
        }
    }, 50);
}

function nativeShowModal(modalEl: HTMLElement): void {
    modalEl.classList.add('show');
    modalEl.style.display = 'block';
    if (typeof modalEl.removeAttribute === 'function') {
        modalEl.removeAttribute('aria-hidden');
    }
    if (typeof modalEl.setAttribute === 'function') {
        modalEl.setAttribute('aria-modal', 'true');
    }
    if (document.body && document.body.classList) {
        document.body.classList.add('modal-open');
    }

    // Create backdrop if not already present
    if (!document.querySelector('.modal-backdrop')) {
        const backdrop = document.createElement('div');
        backdrop.className = 'modal-backdrop fade show';
        if (document.body && typeof document.body.appendChild === 'function') {
            document.body.appendChild(backdrop);
            activeBackdrops.push(backdrop);
        }
    }
}

export function closeModal(modalTarget: HTMLElement | string): void {
    if (typeof document === 'undefined') return;

    const modalEl = getModalElement(modalTarget);
    if (!modalEl) return;

    // WAI-ARIA Guardrail: Blur any focused descendant before hiding or applying aria-hidden
    if (document.activeElement && typeof modalEl.contains === 'function' && modalEl.contains(document.activeElement)) {
        if (typeof (document.activeElement as HTMLElement).blur === 'function') {
            (document.activeElement as HTMLElement).blur();
        }
    }

    // Delegate to Bootstrap if available
    if (typeof window !== 'undefined' && (window as any).bootstrap && (window as any).bootstrap.Modal) {
        try {
            const instance = (window as any).bootstrap.Modal.getInstance(modalEl);
            if (instance) {
                instance.hide();
            }
        } catch (e) {
            console.warn('[Modal] Bootstrap hide failed, using native cleanup:', e);
        }
    }

    // Always perform native cleanup to ensure DOM consistency
    nativeHideModal(modalEl);

    // Fire any registered hidden callbacks
    const callbacks = onModalHiddenCallbacks.get(modalEl);
    if (callbacks && callbacks.length > 0) {
        const cbList = [...callbacks];
        onModalHiddenCallbacks.delete(modalEl);
        cbList.forEach(cb => {
            try { cb(); } catch (err) { console.error('[Modal] Callback error:', err); }
        });
    }

    // Restore focus to the trigger element per W3C modal guidelines
    const trigger = (modalEl as any)._triggerElement as HTMLElement | null;
    if (trigger && typeof trigger.focus === 'function' && (typeof document.body.contains !== 'function' || document.body.contains(trigger))) {
        setTimeout(() => {
            try {
                trigger.focus();
            } catch (e) {
                // Focus restoration is non-fatal
            }
        }, 30);
    }
}

function nativeHideModal(modalEl: HTMLElement): void {
    modalEl.classList.remove('show');
    modalEl.style.display = 'none';
    if (typeof modalEl.setAttribute === 'function') {
        modalEl.setAttribute('aria-hidden', 'true');
    }
    if (typeof modalEl.removeAttribute === 'function') {
        modalEl.removeAttribute('aria-modal');
    }
    if (document.body && document.body.classList) {
        document.body.classList.remove('modal-open');
    }

    // Remove any created backdrops
    const backdrops = document.querySelectorAll('.modal-backdrop');
    if (backdrops && typeof backdrops.forEach === 'function') {
        backdrops.forEach(b => {
            if (typeof b.remove === 'function') {
                b.remove();
            }
        });
    }
    activeBackdrops = [];
}

/**
 * Initializes global click, keydown, and dismissal listeners for all modals.
 */
export function initModalSystem(): void {
    if (typeof document === 'undefined') return;

    document.addEventListener('click', (e: MouseEvent) => {
        const target = e.target as HTMLElement | null;
        if (!target) return;

        // Handle dismissal buttons with data-bs-dismiss="modal"
        const dismissBtn = target.closest('[data-bs-dismiss="modal"]') as HTMLElement | null;
        if (dismissBtn) {
            const modal = dismissBtn.closest('.modal') as HTMLElement | null;
            if (modal) {
                closeModal(modal);
            }
            return;
        }

        // Handle clicking on the backdrop area of an open modal
        if (target.classList.contains('modal') && target.classList.contains('show')) {
            closeModal(target);
            return;
        }
    });

    // Close open modals on Escape key
    document.addEventListener('keydown', (e: KeyboardEvent) => {
        if (e.key === 'Escape') {
            const openModals = document.querySelectorAll('.modal.show');
            openModals.forEach(m => closeModal(m as HTMLElement));
        }
    });
}
