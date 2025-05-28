// app/login/page.tsx (일부)
// ...
export default function LoginPage() {
  const router = useRouter();
  // ...
  const { login, user: currentUserFromAuth, isLoading: authContextIsLoading } = useAuth(); // 변수명 변경하여 명확화

  // 이미 로그인된 경우 대시보드로 리다이렉트
  useEffect(() => {
    console.log("LoginPage: useEffect for redirect check - currentUserFromAuth:", currentUserFromAuth, "authContextIsLoading:", authContextIsLoading);
    if (currentUserFromAuth && !authContextIsLoading) { // AuthContext의 isLoading 사용
      console.log("LoginPage: User already logged in, redirecting to /dashboard");
      router.push("/dashboard");
    }
  }, [currentUserFromAuth, authContextIsLoading, router]);

  // ...

  // 인증 로딩 중이거나, 사용자가 이미 있는데 아직 리디렉션되지 않은 경우 로딩 UI 표시
  if (authContextIsLoading || (currentUserFromAuth && !authContextIsLoading)) {
      // currentUserFromAuth && !authContextIsLoading 조건은 위의 useEffect에서 리디렉션을 처리하므로,
      // 여기서는 authContextIsLoading만으로도 충분할 수 있습니다.
      // 다만, 리디렉션이 발생하기 전까지 로딩 UI를 보여주는 것이 사용자 경험에 좋을 수 있습니다.
    console.log("LoginPage: Auth is loading or user exists (pre-redirect), showing loading UI");
    return (
      <div className="flex min-h-screen items-center justify-center bg-slate-50">
        <div className="flex flex-col items-center gap-2">
          <div className="h-8 w-8 animate-spin rounded-full border-b-2 border-gray-900"></div>
          <p className="text-sm text-gray-500">로딩 중...</p>
        </div>
      </div>
    );
  }
  // ... (로그인 폼 렌더링)
// ...
}
