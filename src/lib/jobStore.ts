export type JobStore = Map<string, any>;

declare global {
  // eslint-disable-next-line no-var
  var _jobStore: JobStore | undefined;
}

/**
 * HMR / 서버 리스타트 사이에서도 동일한 Map 인스턴스를 재사용하기 위한 전역 JobStore
 * (실서비스에서는 Redis/DB 등을 사용하는 것이 바람직함)
 */
export function getJobStore(): JobStore {
  if (!global._jobStore) {
    global._jobStore = new Map<string, any>();
  }
  return global._jobStore;
}