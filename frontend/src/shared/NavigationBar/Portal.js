import { useEffect, useState } from 'react';
import { createPortal } from 'react-dom';

/**
 * React Portal 컴포넌트
 * 자식 요소를 body에 직접 렌더링하여 부모 CSS 영향 차단
 */
const Portal = ({ children }) => {
  const [container] = useState(() => {
    const el = document.createElement('div');
    el.className = 'portal-container';
    return el;
  });

  useEffect(() => {
    document.body.appendChild(container);
    return () => {
      document.body.removeChild(container);
    };
  }, [container]);

  return createPortal(children, container);
};

export default Portal;
