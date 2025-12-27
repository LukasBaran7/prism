"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { saveApiToken, deleteApiToken } from "@/app/actions/settings";
import { Loader2, CheckCircle, XCircle, Key, ExternalLink, Trash2 } from "lucide-react";

interface ApiTokenFormProps {
  hasToken: boolean;
}

export function ApiTokenForm({ hasToken }: ApiTokenFormProps) {
  const [token, setToken] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [status, setStatus] = useState<"idle" | "success" | "error">("idle");
  const [errorMessage, setErrorMessage] = useState("");

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!token.trim()) return;

    setIsLoading(true);
    setStatus("idle");
    setErrorMessage("");

    try {
      const result = await saveApiToken(token.trim());
      if (result.success) {
        setStatus("success");
        setToken("");
      } else {
        setStatus("error");
        setErrorMessage(result.error || "Failed to save token");
      }
    } catch {
      setStatus("error");
      setErrorMessage("An unexpected error occurred");
    } finally {
      setIsLoading(false);
    }
  };

  const handleDelete = async () => {
    if (!confirm("Are you sure you want to remove your API token?")) return;

    setIsLoading(true);
    try {
      await deleteApiToken();
      setStatus("idle");
    } catch {
      setStatus("error");
      setErrorMessage("Failed to delete token");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Key className="h-5 w-5" />
          Readwise API Token
        </CardTitle>
        <CardDescription>
          Connect your Readwise Reader account to sync your documents.
          {" "}
          <a
            href="https://readwise.io/access_token"
            target="_blank"
            rel="noopener noreferrer"
            className="text-primary hover:underline inline-flex items-center gap-1"
          >
            Get your token here
            <ExternalLink className="h-3 w-3" />
          </a>
        </CardDescription>
      </CardHeader>
      <CardContent>
        {hasToken && status !== "success" ? (
          <div className="space-y-4">
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <CheckCircle className="h-4 w-4 text-green-500" />
              API token is configured
            </div>
            <div className="flex gap-2">
              <Button
                variant="outline"
                onClick={() => setStatus("idle")}
                className="flex-1"
              >
                Update Token
              </Button>
              <Button
                variant="destructive"
                onClick={handleDelete}
                disabled={isLoading}
              >
                {isLoading ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <Trash2 className="h-4 w-4" />
                )}
              </Button>
            </div>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="token">API Token</Label>
              <Input
                id="token"
                type="password"
                placeholder="Enter your Readwise API token"
                value={token}
                onChange={(e) => setToken(e.target.value)}
                disabled={isLoading}
              />
            </div>

            {status === "error" && (
              <div className="flex items-center gap-2 text-sm text-destructive">
                <XCircle className="h-4 w-4" />
                {errorMessage}
              </div>
            )}

            {status === "success" && (
              <div className="flex items-center gap-2 text-sm text-green-600">
                <CheckCircle className="h-4 w-4" />
                Token saved successfully!
              </div>
            )}

            <Button type="submit" disabled={isLoading || !token.trim()}>
              {isLoading ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Validating...
                </>
              ) : (
                "Save Token"
              )}
            </Button>
          </form>
        )}
      </CardContent>
    </Card>
  );
}

