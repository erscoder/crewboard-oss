'use client'

import { useEffect, useState } from 'react'
import { CheckCircle2, XCircle } from 'lucide-react'

export default function OAuthSuccessPage() {
  const [isError, setIsError] = useState(false)

  useEffect(() => {
    if (typeof window === 'undefined') return
    const params = new URLSearchParams(window.location.search)
    const error = params.get('error')
    setIsError(!!error)

    // Notify parent window and close
    window.opener?.postMessage({ type: 'oauth-complete', error: error || null }, window.location.origin)
    const t = setTimeout(() => window.close(), 2000)
    return () => clearTimeout(t)
  }, [])

  return (
    <div className="flex min-h-screen items-center justify-center bg-background">
      <div className="flex flex-col items-center gap-3 text-center px-6">
        {isError ? (
          <>
            <XCircle className="h-10 w-10 text-red-500" />
            <p className="text-sm font-medium">Authorization failed</p>
            <p className="text-xs text-muted-foreground">Check your app credentials and try again.</p>
          </>
        ) : (
          <>
            <CheckCircle2 className="h-10 w-10 text-green-500" />
            <p className="text-sm font-medium">Connected successfully</p>
            <p className="text-xs text-muted-foreground">You can close this window.</p>
          </>
        )}
      </div>
    </div>
  )
}
