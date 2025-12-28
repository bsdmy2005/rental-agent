"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"
import { Textarea } from "@/components/ui/textarea"
import {
  testBrowserUseConnectionAction,
  createTaskWithFileOutputAction,
  createTaskWithStructuredOutputAction,
  createSessionAction,
  listSessionsAction,
  stopSessionAction,
  testAngorPortalAction
} from "@/actions/browser-use-explorer-actions"
import { AlertCircle, CheckCircle2, Loader2, Copy, Check, Download } from "lucide-react"
import { z } from "zod"
import { zodToJsonSchema } from "zod-to-json-schema"

export function BrowserUseExplorerConsole() {
  const [apiKey, setApiKey] = useState<string>("")
  const [connectionStatus, setConnectionStatus] = useState<{
    success: boolean
    message: string
  } | null>(null)
  
  // File Output Tab
  const [fileOutputTask, setFileOutputTask] = useState<string>("Navigate to https://example.com and download any PDF files you find")
  const [fileOutputLlm, setFileOutputLlm] = useState<string>("browser-use-llm")
  const [fileOutputResult, setFileOutputResult] = useState<any>(null)
  
  // Structured Output Tab
  const [structuredTask, setStructuredTask] = useState<string>("Search for top 5 Hacker News posts and return their titles and URLs")
  const [structuredLlm, setStructuredLlm] = useState<string>("browser-use-llm")
  const [structuredResult, setStructuredResult] = useState<any>(null)
  
  // Session Management Tab
  const [sessions, setSessions] = useState<Array<{ id: string; status: string; liveUrl?: string }>>([])
  const [selectedSessionId, setSelectedSessionId] = useState<string>("")
  
  // Real-World Test Tab
  const [angorUrl, setAngorUrl] = useState<string>("https://system.angor.co.za/angor/Online_Statements/onlineStatement.asp?GUID=FBDC50B1-4320-4224-9AE5-ACA591D118A3")
  const [angorPin, setAngorPin] = useState<string>("537083")
  const [angorResult, setAngorResult] = useState<any>(null)
  
  const [loading, setLoading] = useState(false)
  const [copied, setCopied] = useState<string | null>(null)

  const handleTestConnection = async () => {
    setLoading(true)
    setConnectionStatus(null)
    try {
      const result = await testBrowserUseConnectionAction(apiKey)
      setConnectionStatus({
        success: result.isSuccess,
        message: result.message
      })
    } catch (error) {
      setConnectionStatus({
        success: false,
        message: error instanceof Error ? error.message : "Failed to test connection"
      })
    } finally {
      setLoading(false)
    }
  }

  const handleFileOutputTest = async () => {
    setLoading(true)
    setFileOutputResult(null)
    try {
      const result = await createTaskWithFileOutputAction(apiKey, fileOutputTask, {
        llm: fileOutputLlm
      })
      setFileOutputResult(result)
    } catch (error) {
      setFileOutputResult({
        isSuccess: false,
        message: error instanceof Error ? error.message : "Failed to create task"
      })
    } finally {
      setLoading(false)
    }
  }

  const handleStructuredOutputTest = async () => {
    setLoading(true)
    setStructuredResult(null)
    try {
      // Define schema for Hacker News posts
      const schema = z.object({
        posts: z.array(
          z.object({
            title: z.string(),
            url: z.string()
          })
        )
      })
      
      // Convert Zod schema to JSON Schema (serializable)
      const jsonSchema = zodToJsonSchema(schema)
      
      const result = await createTaskWithStructuredOutputAction(
        apiKey,
        structuredTask,
        jsonSchema,
        { llm: structuredLlm }
      )
      setStructuredResult(result)
    } catch (error) {
      setStructuredResult({
        isSuccess: false,
        message: error instanceof Error ? error.message : "Failed to create task"
      })
    } finally {
      setLoading(false)
    }
  }

  const handleCreateSession = async () => {
    setLoading(true)
    try {
      const result = await createSessionAction(apiKey)
      if (result.isSuccess && result.data) {
        setSelectedSessionId(result.data.id)
        await handleListSessions()
      }
    } catch (error) {
      console.error("Failed to create session:", error)
    } finally {
      setLoading(false)
    }
  }

  const handleListSessions = async () => {
    setLoading(true)
    try {
      const result = await listSessionsAction(apiKey)
      if (result.isSuccess && result.data) {
        setSessions(result.data)
      }
    } catch (error) {
      console.error("Failed to list sessions:", error)
    } finally {
      setLoading(false)
    }
  }

  const handleStopSession = async (sessionId: string) => {
    setLoading(true)
    try {
      await stopSessionAction(apiKey, sessionId)
      await handleListSessions()
      if (selectedSessionId === sessionId) {
        setSelectedSessionId("")
      }
    } catch (error) {
      console.error("Failed to stop session:", error)
    } finally {
      setLoading(false)
    }
  }

  const handleAngorTest = async () => {
    setLoading(true)
    setAngorResult(null)
    try {
      const result = await testAngorPortalAction(apiKey, angorUrl, angorPin)
      setAngorResult(result)
    } catch (error) {
      setAngorResult({
        isSuccess: false,
        message: error instanceof Error ? error.message : "Failed to test ANGOR portal"
      })
    } finally {
      setLoading(false)
    }
  }

  const copyToClipboard = (text: string, id: string) => {
    navigator.clipboard.writeText(text)
    setCopied(id)
    setTimeout(() => setCopied(null), 2000)
  }

  return (
    <div className="space-y-6">
      <Tabs defaultValue="configuration" className="w-full">
        <TabsList className="grid w-full grid-cols-5">
          <TabsTrigger value="configuration">Configuration</TabsTrigger>
          <TabsTrigger value="file-output">File Output</TabsTrigger>
          <TabsTrigger value="structured">Structured Output</TabsTrigger>
          <TabsTrigger value="sessions">Sessions</TabsTrigger>
          <TabsTrigger value="real-world">Real-World Test</TabsTrigger>
        </TabsList>

        {/* Configuration Tab */}
        <TabsContent value="configuration" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Browser Use API Configuration</CardTitle>
              <CardDescription>
                Enter your Browser Use API key to authenticate with the API.
                Your API key starts with "bu_" and is available from Browser Use Cloud dashboard.
                This key is never stored and is only used for the current session.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="apiKey">API Key</Label>
                <Input
                  id="apiKey"
                  type="password"
                  placeholder="bu_..."
                  value={apiKey}
                  onChange={(e) => setApiKey(e.target.value)}
                />
                <p className="text-xs text-muted-foreground">
                  Your Browser Use Cloud API key (starts with "bu_")
                </p>
              </div>
              <Button
                onClick={handleTestConnection}
                disabled={loading || !apiKey}
              >
                {loading ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Testing...
                  </>
                ) : (
                  "Test Connection"
                )}
              </Button>
              {connectionStatus && (
                <Alert variant={connectionStatus.success ? "default" : "destructive"}>
                  {connectionStatus.success ? (
                    <CheckCircle2 className="h-4 w-4" />
                  ) : (
                    <AlertCircle className="h-4 w-4" />
                  )}
                  <AlertTitle>{connectionStatus.success ? "Success" : "Error"}</AlertTitle>
                  <AlertDescription>{connectionStatus.message}</AlertDescription>
                </Alert>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* File Output Tab */}
        <TabsContent value="file-output" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>File Output Testing</CardTitle>
              <CardDescription>
                Test tasks that download files (PDFs, images, etc.). Files are automatically downloaded and displayed.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="fileTask">Task Description</Label>
                <Textarea
                  id="fileTask"
                  placeholder="Navigate to https://example.com and download any PDF files you find"
                  value={fileOutputTask}
                  onChange={(e) => setFileOutputTask(e.target.value)}
                  rows={4}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="fileLlm">LLM Model</Label>
                <Input
                  id="fileLlm"
                  type="text"
                  value={fileOutputLlm}
                  onChange={(e) => setFileOutputLlm(e.target.value)}
                  placeholder="browser-use-llm"
                />
              </div>
              <Button
                onClick={handleFileOutputTest}
                disabled={loading || !apiKey || !fileOutputTask}
              >
                {loading ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Running Task...
                  </>
                ) : (
                  "Run Task"
                )}
              </Button>
              {fileOutputResult && (
                <Alert variant={fileOutputResult.isSuccess ? "default" : "destructive"}>
                  {fileOutputResult.isSuccess ? (
                    <CheckCircle2 className="h-4 w-4" />
                  ) : (
                    <AlertCircle className="h-4 w-4" />
                  )}
                  <AlertTitle>{fileOutputResult.isSuccess ? "Success" : "Error"}</AlertTitle>
                  <AlertDescription>
                    {fileOutputResult.message}
                    {fileOutputResult.data && (
                      <div className="mt-4 space-y-2">
                        <div className="text-sm">
                          <strong>Task ID:</strong> {fileOutputResult.data.taskId}
                        </div>
                        <div className="text-sm">
                          <strong>Files Found:</strong> {fileOutputResult.data.files?.length || 0}
                        </div>
                        {fileOutputResult.data.files && fileOutputResult.data.files.length > 0 && (
                          <div className="mt-2 space-y-1">
                            {fileOutputResult.data.files.map((file: any, idx: number) => (
                              <div key={idx} className="flex items-center gap-2 text-xs">
                                <Download className="h-3 w-3" />
                                <span>{file.name}</span>
                                <span className="text-muted-foreground">
                                  ({(file.size / 1024).toFixed(2)} KB)
                                </span>
                              </div>
                            ))}
                          </div>
                        )}
                        {fileOutputResult.data.output && (
                          <div className="mt-2">
                            <div className="text-xs font-medium">Output:</div>
                            <pre className="mt-1 max-h-40 overflow-auto rounded bg-muted p-2 text-xs">
                              {fileOutputResult.data.output.substring(0, 500)}
                            </pre>
                          </div>
                        )}
                      </div>
                    )}
                  </AlertDescription>
                </Alert>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Structured Output Tab */}
        <TabsContent value="structured" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Structured Output Testing</CardTitle>
              <CardDescription>
                Test tasks with Zod schemas to get structured, validated output.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="structuredTask">Task Description</Label>
                <Textarea
                  id="structuredTask"
                  placeholder="Search for top 5 Hacker News posts and return their titles and URLs"
                  value={structuredTask}
                  onChange={(e) => setStructuredTask(e.target.value)}
                  rows={4}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="structuredLlm">LLM Model</Label>
                <Input
                  id="structuredLlm"
                  type="text"
                  value={structuredLlm}
                  onChange={(e) => setStructuredLlm(e.target.value)}
                  placeholder="browser-use-llm"
                />
              </div>
              <Button
                onClick={handleStructuredOutputTest}
                disabled={loading || !apiKey || !structuredTask}
              >
                {loading ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Running Task...
                  </>
                ) : (
                  "Run Task"
                )}
              </Button>
              {structuredResult && (
                <Alert variant={structuredResult.isSuccess ? "default" : "destructive"}>
                  {structuredResult.isSuccess ? (
                    <CheckCircle2 className="h-4 w-4" />
                  ) : (
                    <AlertCircle className="h-4 w-4" />
                  )}
                  <AlertTitle>{structuredResult.isSuccess ? "Success" : "Error"}</AlertTitle>
                  <AlertDescription>
                    {structuredResult.message}
                    {structuredResult.data && structuredResult.data.parsed && (
                      <div className="mt-4">
                        <div className="text-xs font-medium">Parsed Output:</div>
                        <pre className="mt-1 max-h-60 overflow-auto rounded bg-muted p-2 text-xs">
                          {JSON.stringify(structuredResult.data.parsed, null, 2)}
                        </pre>
                      </div>
                    )}
                  </AlertDescription>
                </Alert>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Sessions Tab */}
        <TabsContent value="sessions" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Session Management</CardTitle>
              <CardDescription>
                Create and manage browser sessions for multi-step workflows with state preservation.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex gap-2">
                <Button
                  onClick={handleCreateSession}
                  disabled={loading || !apiKey}
                >
                  {loading ? (
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  ) : null}
                  Create Session
                </Button>
                <Button
                  onClick={handleListSessions}
                  disabled={loading || !apiKey}
                  variant="outline"
                >
                  Refresh Sessions
                </Button>
              </div>
              {sessions.length > 0 && (
                <div className="space-y-2">
                  <Label>Sessions ({sessions.length})</Label>
                  {sessions.map((session) => (
                    <div
                      key={session.id}
                      className="flex items-center justify-between rounded-md border p-3"
                    >
                      <div className="flex-1">
                        <div className="text-sm font-medium">{session.id}</div>
                        <div className="text-xs text-muted-foreground">
                          Status: {session.status}
                        </div>
                        {session.liveUrl && (
                          <div className="mt-1">
                            <Button
                              variant="link"
                              size="sm"
                              className="h-auto p-0 text-xs"
                              onClick={() => window.open(session.liveUrl, "_blank")}
                            >
                              View Live
                            </Button>
                          </div>
                        )}
                      </div>
                      <Button
                        variant="destructive"
                        size="sm"
                        onClick={() => handleStopSession(session.id)}
                        disabled={loading}
                      >
                        Stop
                      </Button>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Real-World Test Tab */}
        <TabsContent value="real-world" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>ANGOR Portal Test</CardTitle>
              <CardDescription>
                Test real-world PDF extraction from ANGOR portal with PIN authentication.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="angorUrl">Portal URL</Label>
                <Input
                  id="angorUrl"
                  type="text"
                  value={angorUrl}
                  onChange={(e) => setAngorUrl(e.target.value)}
                  placeholder="https://system.angor.co.za/..."
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="angorPin">PIN</Label>
                <Input
                  id="angorPin"
                  type="text"
                  value={angorPin}
                  onChange={(e) => setAngorPin(e.target.value)}
                  placeholder="537083"
                />
              </div>
              <Button
                onClick={handleAngorTest}
                disabled={loading || !apiKey || !angorUrl || !angorPin}
              >
                {loading ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Extracting PDF...
                  </>
                ) : (
                  "Extract PDF"
                )}
              </Button>
              {angorResult && (
                <Alert variant={angorResult.isSuccess ? "default" : "destructive"}>
                  {angorResult.isSuccess ? (
                    <CheckCircle2 className="h-4 w-4" />
                  ) : (
                    <AlertCircle className="h-4 w-4" />
                  )}
                  <AlertTitle>{angorResult.isSuccess ? "Success" : "Error"}</AlertTitle>
                  <AlertDescription>
                    {angorResult.message}
                    {angorResult.data && (
                      <div className="mt-4 space-y-2">
                        <div className="text-sm">
                          <strong>Task ID:</strong> {angorResult.data.taskId}
                        </div>
                        <div className="text-sm">
                          <strong>PDF Downloaded:</strong> {angorResult.data.pdfDownloaded ? "Yes" : "No"}
                        </div>
                        {angorResult.data.files && angorResult.data.files.length > 0 && (
                          <div className="mt-2 space-y-1">
                            {angorResult.data.files.map((file: any, idx: number) => (
                              <div key={idx} className="flex items-center gap-2 text-xs">
                                <Download className="h-3 w-3" />
                                <span>{file.name}</span>
                                <span className="text-muted-foreground">
                                  ({(file.size / 1024).toFixed(2)} KB)
                                </span>
                              </div>
                            ))}
                          </div>
                        )}
                      </div>
                    )}
                  </AlertDescription>
                </Alert>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  )
}

