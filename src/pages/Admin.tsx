import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { Loader2, FileText, CheckCircle, AlertCircle } from "lucide-react";

export default function Admin() {
  const [isProcessing, setIsProcessing] = useState(false);
  const [progress, setProgress] = useState(0);
  const [status, setStatus] = useState("");
  const [result, setResult] = useState<any>(null);
  const { toast } = useToast();

  const handleProcessPDF = async () => {
    setIsProcessing(true);
    setProgress(0);
    setStatus("Initializing PDF processing...");
    setResult(null);

    try {
      // Call the process-pdf edge function
      const { data, error } = await supabase.functions.invoke('process-pdf', {
        body: {}
      });

      if (error) throw error;

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

  return (
    <div className="container mx-auto p-6 max-w-4xl">
      <div className="mb-8">
        <h1 className="text-4xl font-bold mb-2">Admin Dashboard</h1>
        <p className="text-muted-foreground">Manage Navy Diving Manual data processing</p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <FileText className="h-5 w-5" />
            PDF Processing
          </CardTitle>
          <CardDescription>
            Process the Navy Diving Manual PDF and populate the database with searchable chunks.
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
