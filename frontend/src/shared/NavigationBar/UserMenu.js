import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { USER_TIERS } from '../../contexts/AuthContext';
import { getHostUrl, HOSTS } from '../../utils/hostConfig';
import { LevelCard } from '../../components';
import { getNicknameStatus, setNickname, getRandomNickname, validateNickname, checkNickname } from '../../services/level';

// 무림 레벨 아이콘 (5레벨 단위, 1~100)
const getLevelIcon = (level) => {
  const lv = parseInt(level) || 1;
  if (lv >= 96) return '🐲'; // 무림맹주
  if (lv >= 91) return '⚡'; // 천하쌍벽
  if (lv >= 86) return '🌟'; // 천하삼대고수
  if (lv >= 81) return '⭐'; // 천하오절
  if (lv >= 76) return '🧓'; // 구파 장로
  if (lv >= 71) return '🦸'; // 대협
  if (lv >= 66) return '🔥'; // 절정 고수
  if (lv >= 61) return '💪'; // 실력파 고수
  if (lv >= 56) return '📢'; // 소문난 고수
  if (lv >= 51) return '🌍'; // 강호 데뷔
  if (lv >= 46) return '👑'; // 장문 후계자
  if (lv >= 41) return '🥇'; // 수석 제자
  if (lv >= 36) return '🏠'; // 내문 제자
  if (lv >= 31) return '🩸'; // 실전 경험자
  if (lv >= 26) return '⚔️'; // 중급 제자
  if (lv >= 21) return '🏃'; // 사형 심부름꾼
  if (lv >= 16) return '🌅'; // 아침 수련 참가자
  if (lv >= 11) return '📜'; // 정식 제자
  if (lv >= 6) return '🧹';  // 잡일 전담 제자
  return '👀'; // 문파 구경꾼
};

/**
 * 사용자 메뉴 드롭다운 컴포넌트
 */
const UserMenu = ({
  user,
  isOpen,
  onToggle,
  onLogout,
  onMenuItemClick,
  viewAsTier,
  onViewAsTier,
  isActualAdmin,
  userMenuRef,
  refreshUser,
  unreadCount = 0,
  onNotificationClick,
  isMobile = false
}) => {
  const { t } = useTranslation();

  // 닉네임 관련 상태
  const [nicknameStatus, setNicknameStatusState] = useState(null);
  const [showNicknameModal, setShowNicknameModal] = useState(false);
  const [newNickname, setNewNickname] = useState('');
  const [error, setError] = useState('');
  const [saving, setSaving] = useState(false);
  const [validating, setValidating] = useState(false);
  const [showConfirmDialog, setShowConfirmDialog] = useState(false);

  const tierLabels = {
    [USER_TIERS.GUEST]: t('auth.tiers.guest'),
    [USER_TIERS.GENERAL]: t('auth.tiers.general'),
    [USER_TIERS.SUBSCRIBER]: t('auth.tiers.subscriber'),
    [USER_TIERS.FAMILY]: t('auth.tiers.family'),
    [USER_TIERS.ADMIN]: t('auth.tiers.admin')
  };

  // 닉네임 상태 조회
  useEffect(() => {
    if (isOpen) {
      getNicknameStatus()
        .then(setNicknameStatusState)
        .catch(() => setNicknameStatusState(null));
    }
  }, [isOpen]);

  const handleEditClick = () => {
    setNewNickname(nicknameStatus?.nickname || user.nickname || user.displayName || '');
    setError('');
    setShowNicknameModal(true);
  };

  const handleCancel = () => {
    setShowNicknameModal(false);
    setShowConfirmDialog(false);
    setError('');
  };

  const handleRandomNickname = async () => {
    try {
      const result = await getRandomNickname();
      setNewNickname(result.nickname);
      setError('');
    } catch (err) {
      setError('랜덤 닉네임 생성 실패');
    }
  };

  // 닉네임 유효성 검사 (비속어 + 중복 체크)
  const validateAndCheck = async (nickname) => {
    setValidating(true);
    setError('');

    try {
      // 1. 유효성 검사 (비속어, 길이 등)
      const validateResult = await validateNickname(nickname);
      if (!validateResult.valid) {
        setError(validateResult.reason || '사용할 수 없는 닉네임입니다');
        setValidating(false);
        return false;
      }

      // 2. 중복 검사
      const checkResult = await checkNickname(nickname);
      if (!checkResult.available) {
        setError('이미 사용 중인 닉네임입니다');
        setValidating(false);
        return false;
      }

      setValidating(false);
      return true;
    } catch (err) {
      setError('닉네임 확인 중 오류가 발생했습니다');
      setValidating(false);
      return false;
    }
  };

  // 변경 버튼 클릭 → 유효성 검사 후 확인 다이얼로그 표시
  const handleSaveClick = async () => {
    if (!newNickname.trim()) {
      setError('닉네임을 입력해주세요');
      return;
    }

    if (newNickname.trim() === (nicknameStatus?.nickname || user.nickname || user.displayName)) {
      setError('현재 닉네임과 동일합니다');
      return;
    }

    // 유효성 검사
    const isValid = await validateAndCheck(newNickname.trim());
    if (isValid) {
      setShowConfirmDialog(true);
    }
  };

  // 최종 확인 후 저장
  const handleConfirmSave = async () => {
    setSaving(true);
    setError('');

    try {
      await setNickname(newNickname.trim());
      setShowNicknameModal(false);
      setShowConfirmDialog(false);
      // 닉네임 상태 새로고침
      const status = await getNicknameStatus();
      setNicknameStatusState(status);
      // AuthContext의 user 정보 갱신
      if (refreshUser) {
        await refreshUser();
      }
    } catch (err) {
      setShowConfirmDialog(false);
      setError(err.message || '닉네임 변경 실패');
    } finally {
      setSaving(false);
    }
  };

  // PRD: displayName은 API에서 제공 (nickname 우선, 항상 존재)
  // user.displayName: /api/me에서 가져온 값
  // user.nickname: DB 필드 값
  // nicknameStatus?.nickname: 닉네임 API에서 별도로 가져온 값
  const displayName = user.displayName || user.nickname || nicknameStatus?.nickname;
  const canChange = nicknameStatus?.canChange !== false;

  return (
    <div className={`relative ${isOpen ? 'z-50' : ''}`} ref={userMenuRef}>
      {/* 메인 트리거 (아바타 + 닉네임 + 레벨) - 알림 빨간점은 아바타에 통합 */}
      <button
        className="flex items-center gap-2 px-2 py-1.5 rounded-full hover:bg-gray-100 transition-colors duration-200"
        onClick={onToggle}
      >
        <span className="relative w-8 h-8 flex items-center justify-center rounded-full bg-gradient-to-br from-blue-100 to-blue-200">
          <span className={`text-lg level-icon level-icon-${Math.ceil((user?.level || 1) / 5).toString().padStart(2, '0')}`}>
            {getLevelIcon(user?.level || 1)}
          </span>
          {/* 알림 빨간 점 (읽지 않은 알림이 있을 때) */}
          {unreadCount > 0 && (
            <span
              className="absolute -top-0.5 -right-0.5 w-3 h-3 bg-red-500 rounded-full border-2 border-white cursor-pointer"
              onClick={(e) => {
                e.stopPropagation();
                onNotificationClick?.();
              }}
            />
          )}
        </span>
        {!isMobile && (
          <span className="flex items-center gap-1.5">
            <span className="text-sm font-medium text-gray-700">{displayName}</span>
            {user.level && <span className="text-xs text-gray-500 bg-gray-100 px-1.5 py-0.5 rounded">Lv.{user.level}</span>}
          </span>
        )}
        {viewAsTier && <span className="text-sm">👁</span>}
        <svg className={`w-2.5 h-1.5 text-gray-400 transition-transform duration-200 ${isOpen ? 'rotate-180' : ''}`} viewBox="0 0 10 6">
          <path d="M1 1l4 4 4-4" stroke="currentColor" strokeWidth="1.5" fill="none" />
        </svg>
      </button>

      {isOpen && (
        <div className="absolute right-0 top-full mt-2 w-72 bg-white rounded-lg shadow-lg border border-gray-200 overflow-hidden z-50">
          <div className="p-4">
            {/* 내 정보 섹션 */}
            <div className="mb-4">
              <div className="flex items-start gap-3">
                <span className="w-12 h-12 flex items-center justify-center rounded-full bg-gradient-to-br from-blue-100 to-blue-200 flex-shrink-0">
                  <span className={`text-2xl level-icon level-icon-${Math.ceil((user?.level || 1) / 5).toString().padStart(2, '0')}`}>
                    {getLevelIcon(user?.level || 1)}
                  </span>
                </span>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-1.5 mb-1">
                    <span className="font-semibold text-gray-900 truncate">{displayName}</span>
                    {canChange && (
                      <button
                        className="text-sm hover:bg-gray-100 rounded p-0.5 transition-colors"
                        onClick={handleEditClick}
                        title="닉네임 변경"
                      >
                        ✏️
                      </button>
                    )}
                  </div>
                  <span className="block text-sm text-gray-500 truncate">{user.email}</span>
                  <span className="inline-block mt-1 text-xs bg-blue-100 text-blue-700 px-2 py-0.5 rounded-full">{tierLabels[user.tier]}</span>
                  {nicknameStatus && !canChange && nicknameStatus.nextChangeDate && (
                    <span className="block mt-1 text-xs text-gray-400">
                      닉변 가능: {new Date(nicknameStatus.nextChangeDate).toLocaleDateString('ko-KR')}
                    </span>
                  )}
                </div>
              </div>
            </div>

            {/* 레벨 카드 */}
            <div className="mb-4">
              <LevelCard />
            </div>

            <div className="border-t border-gray-200 my-2"></div>

            {/* 프로필 링크 - auth.ilouli.com으로 이동 */}
            <a
              href="https://auth.ilouli.com/profile"
              className="flex items-center gap-3 px-4 py-2 hover:bg-gray-50 rounded-lg transition-colors"
              onClick={onMenuItemClick}
            >
              <span className="text-lg">👤</span>
              <span className="text-sm text-gray-700">{t('nav.myProfile')}</span>
            </a>

            {/* 관리자 전용 메뉴 */}
            {isActualAdmin && (
              <>
                <a
                  href={getHostUrl(HOSTS.ADMIN, '/')}
                  className="flex items-center gap-3 px-4 py-2 hover:bg-gray-50 rounded-lg transition-colors"
                  onClick={onMenuItemClick}
                >
                  <span className="text-lg">⚙️</span>
                  <span className="text-sm text-gray-700">{t('nav.adminDashboard')}</span>
                </a>

                <div className="border-t border-gray-200 my-2"></div>

                {/* 등급 시뮬레이션 섹션 */}
                <div className="px-4 py-2">
                  <span className="block text-xs text-gray-500 mb-2">{t('nav.viewAsOtherTier')}</span>
                  <div className="flex flex-wrap gap-1.5">
                    <button
                      className={`text-xs px-2 py-1 rounded transition-colors ${viewAsTier === null ? 'bg-blue-500 text-white' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'}`}
                      onClick={() => onViewAsTier(null)}
                    >
                      {t('nav.adminDefault')}
                    </button>
                    <button
                      className={`text-xs px-2 py-1 rounded transition-colors ${viewAsTier === USER_TIERS.FAMILY ? 'bg-blue-500 text-white' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'}`}
                      onClick={() => onViewAsTier(USER_TIERS.FAMILY)}
                    >
                      {t('auth.tiers.family')}
                    </button>
                    <button
                      className={`text-xs px-2 py-1 rounded transition-colors ${viewAsTier === USER_TIERS.SUBSCRIBER ? 'bg-blue-500 text-white' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'}`}
                      onClick={() => onViewAsTier(USER_TIERS.SUBSCRIBER)}
                    >
                      {t('auth.tiers.subscriber')}
                    </button>
                    <button
                      className={`text-xs px-2 py-1 rounded transition-colors ${viewAsTier === USER_TIERS.GENERAL ? 'bg-blue-500 text-white' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'}`}
                      onClick={() => onViewAsTier(USER_TIERS.GENERAL)}
                    >
                      {t('auth.tiers.general')}
                    </button>
                    <button
                      className={`text-xs px-2 py-1 rounded transition-colors ${viewAsTier === USER_TIERS.GUEST ? 'bg-blue-500 text-white' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'}`}
                      onClick={() => onViewAsTier(USER_TIERS.GUEST)}
                    >
                      {t('auth.tiers.guest')}
                    </button>
                  </div>
                  {viewAsTier && (
                    <div
                      className="mt-2 text-xs text-amber-600 bg-amber-50 px-2 py-1 rounded"
                      dangerouslySetInnerHTML={{
                        __html: t('nav.viewingAs', { tierLabel: tierLabels[viewAsTier] })
                      }}
                    />
                  )}
                </div>
              </>
            )}

            <div className="border-t border-gray-200 my-2"></div>

            {/* 로그아웃 */}
            <button
              onClick={onLogout}
              className="flex items-center gap-3 w-full px-4 py-2 hover:bg-red-50 rounded-lg transition-colors text-red-600"
            >
              <span className="text-lg">🚪</span>
              <span className="text-sm">{t('auth.logout')}</span>
            </button>
          </div>
        </div>
      )}

      {/* 닉네임 변경 모달 */}
      {showNicknameModal && (
        <div
          className="fixed inset-0 bg-black/50 flex items-center justify-center z-[100]"
          onClick={handleCancel}
        >
          <div
            className="bg-white rounded-lg shadow-xl w-full max-w-sm mx-4"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between px-4 py-3 border-b border-gray-200">
              <h3 className="text-lg font-semibold text-gray-900">닉네임 변경</h3>
              <button
                className="text-gray-400 hover:text-gray-600 text-2xl leading-none"
                onClick={handleCancel}
              >
                ×
              </button>
            </div>
            <div className="p-4">
              <p className="text-sm text-gray-500 mb-4">
                닉네임은 6개월에 한 번만 변경할 수 있습니다.
              </p>
              <div className="flex gap-2 mb-2">
                <input
                  type="text"
                  value={newNickname}
                  onChange={(e) => setNewNickname(e.target.value)}
                  placeholder="새 닉네임 입력"
                  className="flex-1 px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm"
                  maxLength={12}
                  autoFocus
                />
                <button
                  className="px-3 py-2 bg-gray-100 hover:bg-gray-200 rounded-lg transition-colors text-lg"
                  onClick={handleRandomNickname}
                  title="랜덤 닉네임"
                >
                  🎲
                </button>
              </div>
              {error && <span className="block text-sm text-red-500 mb-2">{error}</span>}
              <p className="text-xs text-gray-400 leading-relaxed">
                • 2~12자 한글/영문/숫자<br />
                • 비속어, 부적절한 닉네임 사용 불가<br />
                • 다른 사용자와 중복 불가
              </p>
            </div>
            <div className="flex gap-2 px-4 py-3 border-t border-gray-200">
              <button
                className="flex-1 px-4 py-2 bg-gray-100 hover:bg-gray-200 rounded-lg transition-colors text-sm text-gray-700 disabled:opacity-50"
                onClick={handleCancel}
                disabled={saving || validating}
              >
                취소
              </button>
              <button
                className="flex-1 px-4 py-2 bg-blue-500 hover:bg-blue-600 text-white rounded-lg transition-colors text-sm disabled:opacity-50"
                onClick={handleSaveClick}
                disabled={saving || validating}
              >
                {validating ? '확인 중...' : '변경'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 변경 확인 다이얼로그 */}
      {showConfirmDialog && (
        <div
          className="fixed inset-0 bg-black/50 flex items-center justify-center z-[100]"
          onClick={() => setShowConfirmDialog(false)}
        >
          <div
            className="bg-white rounded-lg shadow-xl w-full max-w-xs mx-4 p-6 text-center"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="text-4xl mb-4">⚠️</div>
            <h4 className="text-lg font-semibold text-gray-900 mb-2">닉네임을 변경하시겠습니까?</h4>
            <p className="text-sm text-gray-500 mb-4">
              <strong className="text-gray-900">"{newNickname}"</strong>으로 변경됩니다.<br />
              변경 후 6개월간 다시 변경할 수 없습니다.
            </p>
            <div className="flex gap-2">
              <button
                className="flex-1 px-4 py-2 bg-gray-100 hover:bg-gray-200 rounded-lg transition-colors text-sm text-gray-700 disabled:opacity-50"
                onClick={() => setShowConfirmDialog(false)}
                disabled={saving}
              >
                취소
              </button>
              <button
                className="flex-1 px-4 py-2 bg-blue-500 hover:bg-blue-600 text-white rounded-lg transition-colors text-sm disabled:opacity-50"
                onClick={handleConfirmSave}
                disabled={saving}
              >
                {saving ? '변경 중...' : '변경하기'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default UserMenu;
