import { useEffect, useRef } from 'react'
import { createPortal } from 'react-dom'

function Modal({ open, children, onClose }) {
  const dialog = useRef(null)

  useEffect(() => {
    if (dialog.current) {
      if (open) {
        dialog.current.showModal()
      } else {
        dialog.current.close()
      }
    }
  }, [open])

  return createPortal(
    <dialog ref={dialog} onClose={onClose}>
      {open ? children : null}
    </dialog>,
    typeof window !== undefined ? document.getElementById('modal') : null
  )
}

export default Modal
