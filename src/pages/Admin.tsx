import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { Loader2, FileText, CheckCircle, AlertCircle, Upload, Database } from "lucide-react";

export default function Admin() {
  const [isProcessing, setIsProcessing] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [isInitializing, setIsInitializing] = useState(false);
  const [progress, setProgress] = useState(0);
  const [status, setStatus] = useState("");
  const [result, setResult] = useState<any>(null);
  const [initResult, setInitResult] = useState<any>(null);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [bucketName, setBucketName] = useState("manuals");
  const [uploadedPath, setUploadedPath] = useState<string | null>(null);
  const { toast } = useToast();

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file && file.type === 'application/pdf') {
      setSelectedFile(file);
      setUploadedPath(null);
    } else {
      toast({
        title: "Invalid File",
        description: "Please select a PDF file",
        variant: "destructive",
      });
    }
  };

  const handleUpload = async () => {
    if (!selectedFile) {
      toast({
        title: "No File Selected",
        description: "Please select a PDF file first",
        variant: "destructive",
      });
      return;
    }

    setIsUploading(true);
    setStatus("Uploading PDF to storage...");

    try {
      const filePath = `navy-diving-manual.pdf`;
      
      // Upload to Supabase Storage
      const { data, error } = await supabase.storage
        .from(bucketName)
        .upload(filePath, selectedFile, {
          cacheControl: '3600',
          upsert: true // Replace if exists
        });

      if (error) throw error;

      setUploadedPath(filePath);
      setStatus("Upload complete!");
      
      toast({
        title: "Success!",
        description: `Uploaded ${selectedFile.name} to storage`,
      });
    } catch (error: any) {
      console.error('Upload error:', error);
      setStatus("Error uploading PDF");
      toast({
        title: "Upload Error",
        description: error.message || "Failed to upload PDF",
        variant: "destructive",
      });
    } finally {
      setIsUploading(false);
    }
  };

  const handleProcessPDF = async () => {
    setIsProcessing(true);
    setProgress(0);
    setStatus("Initializing PDF processing...");
    setResult(null);

    try {
      // Call the process-pdf edge function
      const { data, error } = await supabase.functions.invoke('process-pdf', {
        body: { 
          bucketName,
          filePath: uploadedPath || 'navy-diving-manual.pdf'
        }
      });

      if (error) throw error;

      if (data.error) {
        throw new Error(data.error);
      }

      setResult(data);
      setProgress(100);
      setStatus("Processing complete!");
      
      toast({
        title: "Success!",
        description: `Processed ${data.chunksCreated} chunks from the Navy Diving Manual`,
      });
    } catch (error: any) {
      console.error('Processing error:', error);
      setStatus("Error processing PDF");
      toast({
        title: "Error",
        description: error.message || "Failed to process PDF",
        variant: "destructive",
      });
    } finally {
      setIsProcessing(false);
    }
  };

  const handleInitIndex = async () => {
    setIsInitializing(true);
    setStatus("Initializing dive manual index...");
    setInitResult(null);

    try {
      const { data, error } = await supabase.functions.invoke('init-dive-index');

      if (error) throw error;
      if (data.error) throw new Error(data.error);

      setInitResult(data);
      setStatus(data.message || "Initialization complete!");
      
      toast({
        title: "Success!",
        description: data.seeded 
          ? `Dive manual indexed: ${data.chunks} chunks created`
          : "Index already exists - no changes needed",
      });
    } catch (error: any) {
      console.error('Init error:', error);
      setStatus("Error initializing index");
      toast({
        title: "Error",
        description: error.message || "Failed to initialize index",
        variant: "destructive",
      });
    } finally {
      setIsInitializing(false);
    }
  };

  return (
    <div className="container mx-auto p-6 max-w-4xl space-y-6">
      <div className="mb-8">
        <h1 className="text-4xl font-bold mb-2">Admin Dashboard</h1>
        <p className="text-muted-foreground">Manage Navy Diving Manual data processing</p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Database className="h-5 w-5" />
            Auto-Initialize Index
          </CardTitle>
          <CardDescription>
            Automatically download and process the Navy Diving Manual from the configured URL.
            This will populate the database with searchable chunks and embeddings.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <Button
            onClick={handleInitIndex}
            disabled={isInitializing}
            size="lg"
            className="w-full"
          >
            {isInitializing ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Initializing...
              </>
            ) : (
              <>
                <Database className="mr-2 h-4 w-4" />
                Initialize Dive Manual Index
              </>
            )}
          </Button>

          {initResult && (
            <div className="rounded-lg border bg-card p-4 space-y-2">
              <div className="flex items-center gap-2 text-green-600">
                <CheckCircle className="h-5 w-5" />
                <span className="font-semibold">
                  {initResult.seeded ? "Index Created" : "Already Populated"}
                </span>
              </div>
              <div className="text-sm space-y-1">
                <p><strong>Chunks:</strong> {initResult.chunks}</p>
                <p><strong>Message:</strong> {initResult.message}</p>
              </div>
            </div>
          )}

          <div className="bg-muted rounded-lg p-4 text-sm space-y-2">
            <h4 className="font-semibold">What this does:</h4>
            <ul className="list-disc list-inside space-y-1 text-muted-foreground">
              <li>Downloads PDF from DIVE_MANUAL_URL environment variable</li>
              <li>Extracts text from all pages</li>
              <li>Chunks text into searchable segments</li>
              <li>Generates embeddings via OpenAI</li>
              <li>Stores in database (idempotent - won't duplicate)</li>
              <li>Typically takes 20-40 minutes for first run</li>
            </ul>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Upload className="h-5 w-5" />
            Upload Manual
          </CardTitle>
          <CardDescription>
            Upload the Navy Diving Manual PDF to storage before processing.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="bucket">Storage Bucket</Label>
            <Input
              id="bucket"
              value={bucketName}
              onChange={(e) => setBucketName(e.target.value)}
              placeholder="manuals"
            />
          </div>
          
          <div className="space-y-2">
            <Label htmlFor="pdf-file">Select PDF File</Label>
            <Input
              id="pdf-file"
              type="file"
              accept=".pdf"
              onChange={handleFileSelect}
              disabled={isUploading}
            />
            {selectedFile && (
              <p className="text-sm text-muted-foreground">
                Selected: {selectedFile.name} ({(selectedFile.size / 1024 / 1024).toFixed(2)} MB)
              </p>
            )}
          </div>

          <Button
            onClick={handleUpload}
            disabled={!selectedFile || isUploading}
            className="w-full"
          >
            {isUploading ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Uploading...
              </>
            ) : (
              <>
                <Upload className="mr-2 h-4 w-4" />
                Upload to Storage
              </>
            )}
          </Button>

          {uploadedPath && (
            <div className="rounded-lg border bg-card p-3">
              <p className="text-sm text-green-600 flex items-center gap-2">
                <CheckCircle className="h-4 w-4" />
                Uploaded to: {bucketName}/{uploadedPath}
              </p>
            </div>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <FileText className="h-5 w-5" />
            Process Manual
          </CardTitle>
          <CardDescription>
            Extract text, generate embeddings, and populate the database with searchable chunks.
            This will take approximately 20-40 minutes to complete.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <Button
            onClick={handleProcessPDF}
            disabled={isProcessing}
            size="lg"
            className="w-full"
          >
            {isProcessing ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Processing...
              </>
            ) : (
              <>
                <FileText className="mr-2 h-4 w-4" />
                Process Navy Dive Manual
              </>
            )}
          </Button>

          {isProcessing && (
            <div className="space-y-2">
              <div className="flex items-center justify-between text-sm">
                <span className="text-muted-foreground">{status}</span>
                <span className="font-medium">{progress}%</span>
              </div>
              <Progress value={progress} />
            </div>
          )}

          {result && (
            <div className="rounded-lg border bg-card p-4 space-y-2">
              <div className="flex items-center gap-2 text-green-600">
                <CheckCircle className="h-5 w-5" />
                <span className="font-semibold">Processing Complete</span>
              </div>
              <div className="text-sm space-y-1">
                <p><strong>Chunks Created:</strong> {result.chunksCreated}</p>
                <p><strong>Message:</strong> {result.message}</p>
                <p><strong>Document ID:</strong> {result.documentId}</p>
              </div>
            </div>
          )}

          {status.includes("Error") && (
            <div className="rounded-lg border border-destructive bg-destructive/10 p-4">
              <div className="flex items-center gap-2 text-destructive">
                <AlertCircle className="h-5 w-5" />
                <span className="font-semibold">{status}</span>
              </div>
            </div>
          )}

          <div className="bg-muted rounded-lg p-4 text-sm space-y-2">
            <h4 className="font-semibold">What this does:</h4>
            <ul className="list-disc list-inside space-y-1 text-muted-foreground">
              <li>Reads the Navy Diving Manual PDF from the public folder</li>
              <li>Extracts and chunks the text into searchable segments</li>
              <li>Generates AI embeddings for semantic search</li>
              <li>Stores all data in the database</li>
              <li>Enables full-text and AI-powered search</li>
            </ul>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
