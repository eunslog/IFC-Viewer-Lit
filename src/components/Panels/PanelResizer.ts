export default function PanelResizer(panel: HTMLElement, app: HTMLElement) {

  const RESIZE_THRESHOLD = 15;
  const MAX_WIDTH_RATIO = 2 / 3;

  panel.style.paddingRight = '10px';

  let isResizing = false;
  let initialMouseX = 0;
  let initialPanelWidth = 0;


  const onMouseMove = (event: MouseEvent) => {
    if (!isResizing) return;

    event.preventDefault();
    const deltaX = event.clientX - initialMouseX;
    const newWidth = initialPanelWidth + deltaX;

    if (newWidth > 0 && newWidth < app.offsetWidth * MAX_WIDTH_RATIO) {
      panel.style.width = `${newWidth}px`;
    }
  };

  const onMouseUp = () => {
    if (!isResizing) return;

    isResizing = false;
    window.removeEventListener('mousemove', onMouseMove);
    window.removeEventListener('mouseup', onMouseUp);
  };

  const onResizeHandleMouseDown = (event: MouseEvent) => {
    const rect = panel.getBoundingClientRect();
    if (event.clientX <= rect.right - RESIZE_THRESHOLD) return;

    isResizing = true;
    initialMouseX = event.clientX;
    initialPanelWidth = panel.offsetWidth;
    window.addEventListener('mousemove', onMouseMove);
    window.addEventListener('mouseup', onMouseUp);
    event.preventDefault();
  };

  const updateCursorStyle = (event: MouseEvent) => {
    const rect = panel.getBoundingClientRect();
    panel.style.cursor = event.clientX > rect.right - RESIZE_THRESHOLD ? 'col-resize' : 'default';
  };

  panel.addEventListener('mousedown', onResizeHandleMouseDown);
  panel.addEventListener('mousemove', updateCursorStyle);
  panel.addEventListener('mouseleave', () => {
    if (!isResizing) {
      panel.style.cursor = 'default';
    }
  });
}