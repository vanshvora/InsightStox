export const clearUserCache = (queryClient) => {
  try {
    queryClient?.clear();
  } catch {
    return;
  }
  try {
    localStorage.removeItem('REACT_QUERY_OFFLINE_CACHE');
  } catch {
    return;
  }
};
