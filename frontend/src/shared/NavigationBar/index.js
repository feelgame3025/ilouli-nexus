import React, { useRef, useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useAuth, USER_TIERS } from '../../contexts/AuthContext';
import { useNotification } from '../../contexts/NotificationContext';
import { getHostUrl, getCurrentHost, HOSTS } from '../../utils/hostConfig';
import LanguageSelector from '../LanguageSelector';

import DesktopNav from './DesktopNav';
import MobileNav from './MobileNav';
import NotificationPanel from './NotificationPanel';
import UserMenu from './UserMenu';
import useNavigation from './hooks/useNavigation';

/**
 * 메인 네비게이션 바 컴포넌트
 */
const NavigationBar = () => {
  const { t } = useTranslation();
  const {
    user,
    isAuthenticated,
    logout,
    hasAccess,
    setViewAs,
    resetViewAs,
    viewAsTier,
    getActualTier
  } = useAuth();
  const {
    notifications,
    unreadCount,
    markAsRead,
    markAllAsRead,
    deleteNotification
  } = useNotification();

  // 커스텀 훅에서 네비게이션 상태 및 액션 가져오기
  const {
    isScrolled,
    isMobileMenuOpen,
    activeDropdown,
    isMobile,
    toggleMobileMenu,
    closeMobileMenu,
    handleDropdownClick,
    handleDropdownClose,
    handleDropdownEnter,
    handleDropdownLeave,
    toggleMobileDropdown,
  } = useNavigation();

  // Refs
  const notificationRef = useRef(null);
  const userMenuRef = useRef(null);
  const navRef = useRef(null);

  // 알림/사용자 메뉴/로그인 모달 상태
  const [isNotificationOpen, setIsNotificationOpen] = useState(false);
  const [isUserMenuOpen, setIsUserMenuOpen] = useState(false);

  // 드롭다운 외부 클릭 시 닫기
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (notificationRef.current && !notificationRef.current.contains(event.target)) {
        setIsNotificationOpen(false);
      }
      if (userMenuRef.current && !userMenuRef.current.contains(event.target)) {
        setIsUserMenuOpen(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    document.addEventListener('touchstart', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      document.removeEventListener('touchstart', handleClickOutside);
    };
  }, []);

  // 권한 체크
  const showFamilySpace = hasAccess([USER_TIERS.FAMILY, USER_TIERS.ADMIN]);
  const showAIFeatures = hasAccess([USER_TIERS.SUBSCRIBER, USER_TIERS.FAMILY, USER_TIERS.ADMIN]);
  const isActualAdmin = getActualTier && getActualTier() === USER_TIERS.ADMIN;
  const showAdminLab = hasAccess([USER_TIERS.ADMIN, USER_TIERS.FAMILY]);

  // 핸들러
  const handleLogout = () => {
    setIsUserMenuOpen(false);
    logout();
    window.location.href = getHostUrl(HOSTS.MAIN, '/');
  };

  const handleMenuItemClick = () => {
    setIsUserMenuOpen(false);
  };

  const handleViewAsTier = (tier) => {
    if (tier === null) {
      resetViewAs();
    } else {
      setViewAs(tier);
    }
  };

  const toggleNotification = () => {
    setIsNotificationOpen(!isNotificationOpen);
  };

  // 현재 호스트 정보
  const currentHost = getCurrentHost();
  const isMainHost = currentHost === HOSTS.MAIN;

  // 서브도메인 표시 이름
  const getSubdomainDisplayName = (host) => {
    const displayNames = {
      [HOSTS.AI]: 'AI',
      [HOSTS.COMMUNITY]: 'Community',
      [HOSTS.STOCK]: 'Stock',
      [HOSTS.FAMILY]: 'Family',
      [HOSTS.ADMIN]: 'Admin',
      [HOSTS.LAB]: 'Lab',
      [HOSTS.WORK]: 'Work',
      [HOSTS.NEWS]: 'News',
      [HOSTS.NEXUS]: 'Nexus'
    };
    return displayNames[host] || '';
  };

  return (
    <>
      <header className={`fixed top-0 left-0 right-0 z-[1000] bg-white border-b border-gray-200 ${isScrolled ? 'shadow-sm' : ''}`}>
        <div className="flex items-center relative w-full px-[22px] h-11">
          {/* Stock 스타일 로고: [서브도메인명] ilouli.com */}
          {isMainHost ? (
            <a href={getHostUrl(HOSTS.MAIN, '/')} className="text-xl font-semibold text-gray-900 no-underline tracking-tight hover:text-blue-500">ilouli</a>
          ) : (
            <div className="flex items-center gap-2 relative z-[1005] flex-shrink-0 min-w-[180px]">
              <a href="/" className="text-xl font-bold text-blue-500 no-underline tracking-tight hover:text-blue-600">{getSubdomainDisplayName(currentHost)}</a>
              <a href={getHostUrl(HOSTS.MAIN, '/')} className="text-xs font-normal text-gray-400 no-underline hover:text-gray-900">ilouli.com</a>
            </div>
          )}

          {/* 데스크톱 네비게이션 - CSS 미디어 쿼리로 표시/숨김 제어 */}
          <DesktopNav
            showAIFeatures={showAIFeatures}
            showFamilySpace={showFamilySpace}
            showAdminLab={showAdminLab}
            navRef={navRef}
          />

          <div className="flex items-center gap-4 relative z-[1005] ml-auto">
            <LanguageSelector />

            {/* 사용자 메뉴 (알림은 아바타에 통합) */}
            {isAuthenticated ? (
              <>
                <UserMenu
                user={user}
                isOpen={isUserMenuOpen}
                onToggle={() => setIsUserMenuOpen(!isUserMenuOpen)}
                onLogout={handleLogout}
                onMenuItemClick={handleMenuItemClick}
                viewAsTier={viewAsTier}
                onViewAsTier={handleViewAsTier}
                isActualAdmin={isActualAdmin}
                userMenuRef={userMenuRef}
                unreadCount={unreadCount}
                onNotificationClick={() => setIsNotificationOpen(!isNotificationOpen)}
                isMobile={isMobile}
              />
                {/* 알림 패널 (드롭다운) */}
                {isNotificationOpen && (
                  <NotificationPanel
                    notifications={notifications}
                    unreadCount={unreadCount}
                    isOpen={isNotificationOpen}
                    onToggle={toggleNotification}
                    onMarkAsRead={markAsRead}
                    onMarkAllAsRead={markAllAsRead}
                    onDelete={deleteNotification}
                    onClose={() => setIsNotificationOpen(false)}
                    notificationRef={notificationRef}
                  />
                )}
              </>
            ) : (
              <button
                onClick={() => {
                  const returnUrl = encodeURIComponent(window.location.href);
                  window.location.href = `https://auth.ilouli.com/login?returnUrl=${returnUrl}`;
                }}
                className="text-sm font-medium text-blue-500 hover:text-blue-600 bg-transparent border-none cursor-pointer px-3 py-1.5 rounded-lg hover:bg-blue-50 transition-colors"
              >
                {t('auth.login.button')}
              </button>
            )}

            {/* 모바일 햄버거 버튼 - lg 이상에서 숨김 */}
            <button
              className="lg:hidden flex flex-col justify-center items-center w-11 h-11 bg-transparent border-none cursor-pointer p-2.5"
              style={{ gap: '6px' }}
              onClick={toggleMobileMenu}
              aria-label={t('nav.mobileMenuOpen')}
            >
              <span
                className="block w-5 h-0.5 bg-gray-900 rounded-sm transition-all duration-300 origin-center"
                style={{
                  transform: isMobileMenuOpen ? 'translateY(8px) rotate(45deg)' : 'none'
                }}
              ></span>
              <span
                className="block w-5 h-0.5 bg-gray-900 rounded-sm transition-all duration-300"
                style={{ opacity: isMobileMenuOpen ? 0 : 1 }}
              ></span>
              <span
                className="block w-5 h-0.5 bg-gray-900 rounded-sm transition-all duration-300 origin-center"
                style={{
                  transform: isMobileMenuOpen ? 'translateY(-8px) rotate(-45deg)' : 'none'
                }}
              ></span>
            </button>
          </div>
        </div>
      </header>

      {/* 모바일 네비게이션 - CSS 미디어 쿼리로 표시/숨김 제어 */}
      <MobileNav
        isOpen={isMobileMenuOpen}
        showAIFeatures={showAIFeatures}
        showFamilySpace={showFamilySpace}
        showAdminLab={showAdminLab}
        activeDropdown={activeDropdown}
        onToggleMobileDropdown={toggleMobileDropdown}
        onClose={closeMobileMenu}
      />

    </>
  );
};

export default NavigationBar;
