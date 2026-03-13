import React, { useState, useRef, useEffect, useCallback } from 'react';
import Portal from './Portal';
import { getHostUrl } from '../../utils/hostConfig';
import { Icon } from '../Icons';

/**
 * 네비게이션 드롭다운 컴포넌트 (React Portal 사용)
 * 가로 메뉴 레이아웃, 부모 CSS 영향을 받지 않도록 body에 직접 렌더링
 * Tailwind CSS 스타일 적용
 */
const NavDropdown = ({ label, items, host, isActive, t }) => {
  const [isOpen, setIsOpen] = useState(false);
  const [position, setPosition] = useState({ top: 0, left: 0 });
  const [isMobile, setIsMobile] = useState(() => {
    if (typeof window !== 'undefined') {
      return window.innerWidth <= 833;
    }
    return false;
  });
  const triggerRef = useRef(null);
  const dropdownRef = useRef(null);
  const timeoutRef = useRef(null);

  // 화면 크기 변경 감지
  useEffect(() => {
    const checkMobile = () => {
      setIsMobile(window.innerWidth <= 833);
    };
    window.addEventListener('resize', checkMobile);
    return () => window.removeEventListener('resize', checkMobile);
  }, []);

  // 드롭다운 위치 계산
  const updatePosition = useCallback(() => {
    if (triggerRef.current) {
      const rect = triggerRef.current.getBoundingClientRect();
      setPosition({
        top: rect.bottom + 8,
        left: rect.left + rect.width / 2
      });
    }
  }, []);

  // 마우스 진입 - 모바일에서는 무시
  const handleMouseEnter = () => {
    if (isMobile) return; // 모바일에서는 드롭다운 열지 않음
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
    }
    updatePosition();
    setIsOpen(true);
  };

  // 마우스 이탈
  const handleMouseLeave = () => {
    timeoutRef.current = setTimeout(() => {
      setIsOpen(false);
    }, 100);
  };

  // 드롭다운에 마우스 진입
  const handleDropdownEnter = () => {
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
    }
  };

  // 드롭다운에서 마우스 이탈
  const handleDropdownLeave = () => {
    timeoutRef.current = setTimeout(() => {
      setIsOpen(false);
    }, 100);
  };

  // 클린업
  useEffect(() => {
    return () => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }
    };
  }, []);

  // 스크롤/리사이즈 시 위치 업데이트
  useEffect(() => {
    if (isOpen) {
      window.addEventListener('scroll', updatePosition);
      window.addEventListener('resize', updatePosition);
      return () => {
        window.removeEventListener('scroll', updatePosition);
        window.removeEventListener('resize', updatePosition);
      };
    }
  }, [isOpen, updatePosition]);

  return (
    <li
      className="relative"
      onMouseEnter={handleMouseEnter}
      onMouseLeave={handleMouseLeave}
    >
      <a
        ref={triggerRef}
        href={getHostUrl(host, '/')}
        className={`flex items-center no-underline text-xs font-normal px-3 h-11 leading-[44px] bg-transparent border-none cursor-pointer whitespace-nowrap hover:text-blue-500 transition-colors ${
          isActive ? 'text-blue-500' : 'text-gray-900'
        }`}
      >
        {label}
      </a>

      {/* 모바일에서는 Portal 드롭다운 렌더링하지 않음 */}
      {isOpen && !isMobile && (
        <Portal>
          <div
            ref={dropdownRef}
            className="animate-fadeIn"
            style={{
              position: 'fixed',
              top: position.top,
              left: position.left,
              transform: 'translateX(-50%)',
              zIndex: 99999,
            }}
            onMouseEnter={handleDropdownEnter}
            onMouseLeave={handleDropdownLeave}
          >
            {/* 드롭다운 컨테이너 */}
            <div className="bg-white border border-gray-200 rounded-xl shadow-lg p-2 min-w-[200px] flex flex-row gap-1">
              {items.map((item) => (
                <a
                  key={item.path}
                  href={getHostUrl(host, item.path)}
                  className="flex flex-col items-center justify-center gap-1.5 px-4 py-3 rounded-lg hover:bg-gray-50 text-gray-700 no-underline text-xs font-medium min-w-[70px] text-center whitespace-nowrap transition-colors"
                >
                  <span className="flex items-center justify-center w-7 h-7 text-xl">
                    <Icon name={item.icon} size={20} />
                  </span>
                  <span>{t(item.labelKey) || item.label}</span>
                </a>
              ))}
            </div>
          </div>
        </Portal>
      )}
    </li>
  );
};

export default NavDropdown;
