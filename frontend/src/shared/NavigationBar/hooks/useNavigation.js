import { useState, useEffect, useCallback, useRef } from 'react';
import { useLocation } from 'react-router-dom';

/**
 * Navigation 상태 및 로직을 관리하는 커스텀 훅
 */
export const useNavigation = () => {
  const location = useLocation();
  const [isScrolled, setIsScrolled] = useState(false);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [activeDropdown, setActiveDropdown] = useState(null);
  const [isMobile, setIsMobile] = useState(() => {
    if (typeof window !== 'undefined') {
      return window.innerWidth <= 833;
    }
    return false;
  });

  // 드롭다운 닫기 타이머 레퍼런스 (폴백용)
  const closeTimeoutRef = useRef(null);

  // 현재 호버 중인 영역 추적
  const hoverAreaRef = useRef(null);

  // 모바일 여부 감지 (리사이즈 대응)
  useEffect(() => {
    const checkMobile = () => {
      setIsMobile(window.innerWidth <= 833);
    };

    window.addEventListener('resize', checkMobile);
    return () => window.removeEventListener('resize', checkMobile);
  }, []);

  // 스크롤 감지
  useEffect(() => {
    const handleScroll = () => {
      setIsScrolled(window.scrollY > 10);
    };

    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  // 페이지 이동 시 메뉴 닫기
  useEffect(() => {
    setIsMobileMenuOpen(false);
    setActiveDropdown(null);
    document.body.style.overflow = '';
  }, [location.pathname]);

  // 타이머 클린업
  useEffect(() => {
    return () => {
      if (closeTimeoutRef.current) {
        clearTimeout(closeTimeoutRef.current);
      }
    };
  }, []);

  // 모바일 메뉴 토글
  const toggleMobileMenu = useCallback(() => {
    const newState = !isMobileMenuOpen;
    setIsMobileMenuOpen(newState);
    if (!newState) {
      setActiveDropdown(null);
    }
    document.body.style.overflow = newState ? 'hidden' : '';
  }, [isMobileMenuOpen]);

  // 모바일 메뉴 닫기
  const closeMobileMenu = useCallback(() => {
    setIsMobileMenuOpen(false);
    setActiveDropdown(null);
    document.body.style.overflow = '';
  }, []);

  // 데스크톱: 드롭다운 클릭 토글
  const handleDropdownClick = useCallback((name) => {
    setActiveDropdown(prev => prev === name ? null : name);
  }, []);

  // 드롭다운 닫기
  const handleDropdownClose = useCallback(() => {
    setActiveDropdown(null);
  }, []);

  // 데스크톱: 마우스 호버로 드롭다운 열기
  const handleDropdownEnter = useCallback((name) => {
    // 닫기 타이머가 있으면 취소
    if (closeTimeoutRef.current) {
      clearTimeout(closeTimeoutRef.current);
      closeTimeoutRef.current = null;
    }
    hoverAreaRef.current = name;
    setActiveDropdown(name);
  }, []);

  // 데스크톱: 마우스 떠날 때 드롭다운 닫기 (relatedTarget 체크)
  const handleDropdownLeave = useCallback((e) => {
    const relatedTarget = e?.relatedTarget;

    // 마우스가 이동하는 대상 확인
    if (relatedTarget) {
      // flyout-container나 다른 nav-item으로 이동하면 닫지 않음
      const isMovingToFlyout = relatedTarget.closest?.('.flyout-container');
      const isMovingToNavItem = relatedTarget.closest?.('.nav-item.has-flyout');
      const isMovingToFlyoutPanel = relatedTarget.closest?.('.flyout-panel');

      if (isMovingToFlyout || isMovingToNavItem || isMovingToFlyoutPanel) {
        return; // 닫지 않음
      }
    }

    // 관련 영역 외부로 이동 시 닫기 (300ms 딜레이로 충분한 시간 제공)
    hoverAreaRef.current = null;
    closeTimeoutRef.current = setTimeout(() => {
      setActiveDropdown(null);
    }, 300);
  }, []);

  // 모바일: 드롭다운 토글
  const toggleMobileDropdown = useCallback((name) => {
    setActiveDropdown(prev => prev === name ? null : name);
  }, []);

  return {
    // 상태
    isScrolled,
    isMobileMenuOpen,
    activeDropdown,
    isMobile,
    // 액션
    toggleMobileMenu,
    closeMobileMenu,
    handleDropdownClick,
    handleDropdownClose,
    handleDropdownEnter,
    handleDropdownLeave,
    toggleMobileDropdown,
  };
};

export default useNavigation;
