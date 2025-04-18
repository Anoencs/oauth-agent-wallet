import { useCallback } from "react";

interface GitHubUser {
  id: number;
  login: string;
  name: string;
  email: string;
  auth_date: number;
}

interface GitHubLoginButtonProps {
  dataOnauth: (user: GitHubUser) => void;
  buttonSize?: "small" | "medium" | "large";
}

const GitHubLoginButton = ({
  dataOnauth,
  buttonSize = "medium",
}: GitHubLoginButtonProps) => {
  const clientId = import.meta.env.VITE_GITHUB_CLIENT_ID;
  const redirectUri = import.meta.env.VITE_REDIRECT_URI;

  const handleLogin = useCallback(() => {
    const scope = "read:user";
    const authUrl = `https://github.com/login/oauth/authorize?client_id=${clientId}&redirect_uri=${redirectUri}&scope=${scope}`;
    window.location.href = authUrl;
  }, [clientId, redirectUri]);

  const buttonStyle = {
    padding:
      buttonSize === "small"
        ? "8px 16px"
        : buttonSize === "medium"
        ? "12px 24px"
        : "16px 32px",
    fontSize:
      buttonSize === "small"
        ? "14px"
        : buttonSize === "medium"
        ? "16px"
        : "18px",
    backgroundColor: "#24292e",
    color: "white",
    border: "none",
    borderRadius: "6px",
    cursor: "pointer",
    display: "flex",
    alignItems: "center",
    gap: "8px",
  };

  return (
    <div className="github-button-container">
      <div className="github-button">
        <button onClick={handleLogin} style={buttonStyle}>
          <svg height="20" width="20" viewBox="0 0 16 16" fill="currentColor">
            <path d="M8 0C3.58 0 0 3.58 0 8c0 3.54 2.29 6.53 5.47 7.59.4.07.55-.17.55-.38 0-.19-.01-.82-.01-1.49-2.01.37-2.53-.49-2.69-.94-.09-.23-.48-.94-.82-1.13-.28-.15-.68-.52-.01-.53.63-.01 1.08.58 1.23.82.72 1.21 1.87.87 2.33.66.07-.52.28-.87.51-1.07-1.78-.2-3.64-.89-3.64-3.95 0-.87.31-1.59.82-2.15-.08-.2-.36-1.02.08-2.12 0 0 .67-.21 2.2.82.64-.18 1.32-.27 2-.27.68 0 1.36.09 2 .27 1.53-1.04 2.2-.82 2.2-.82.44 1.1.16 1.92.08 2.12.51.56.82 1.27.82 2.15 0 3.07-1.87 3.75-3.65 3.95.29.25.54.73.54 1.48 0 1.07-.01 1.93-.01 2.2 0 .21.15.46.55.38A8.013 8.013 0 0016 8c0-4.42-3.58-8-8-8z" />
          </svg>
          Sign in with GitHub
        </button>
      </div>
    </div>
  );
};

export default GitHubLoginButton;
