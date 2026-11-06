export type PlayerProfile = {
  nickname: string;
  life_stage: 'student' | 'working';
  income: number;
  savings_goal: number;
};

export const defaultProfile: PlayerProfile = {nickname: '', life_stage: 'working', income: 1500, savings_goal: 200};
export const incomeOptions = {student: [1200, 1500], working: [1500, 2000]};
export function validProfile(value: unknown): value is PlayerProfile {
  if (!value || typeof value !== 'object') return false;
  const p = value as PlayerProfile;
  return typeof p.nickname === 'string' && p.nickname.trim().length > 0 && p.nickname.length <= 40
    && (p.life_stage === 'student' || p.life_stage === 'working')
    && incomeOptions[p.life_stage].includes(p.income)
    && Number.isInteger(p.savings_goal) && p.savings_goal >= 0 && p.savings_goal <= 500 && p.savings_goal % 10 === 0;
}
export function gameConfig(profile: PlayerProfile) {
  return {income: profile.income, bills: profile.life_stage === 'student' ? 250 : 400,
    dailyBaseline: profile.life_stage === 'student' ? 10 : 15,
    title: profile.life_stage === 'student' ? 'Student allowance' : 'First salary',
    lifeStage: profile.life_stage};
}
export type GameConfig = ReturnType<typeof gameConfig>;
