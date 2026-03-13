/**
 * Level service stub for NavigationBar compatibility
 * Full implementation lives in ilouli-main
 */

export const getNicknameStatus = async () => ({
  canChange: false,
  nextChangeDate: null,
  currentNickname: null,
});

export const setNickname = async () => ({ success: false, error: 'Not available on nexus site' });

export const getRandomNickname = async () => ({ nickname: '탐험가' });

export const validateNickname = (nickname) => {
  if (!nickname || nickname.length < 2 || nickname.length > 12) {
    return { valid: false, error: '2~12자 이내로 입력해주세요' };
  }
  return { valid: true };
};

export const checkNickname = async () => ({ available: true });
