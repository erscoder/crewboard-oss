export type GitHubRepo = {
  id: number
  name: string
  full_name: string
  html_url: string
  private: boolean
  owner: { login: string }
  language?: string | null
}

export type GitHubAccessToken = {
  accessToken: string | null
  tokenType?: string | null
  scope?: string | null
  expiresAt?: number | null
}
