
'use client';

import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Textarea } from '@/components/ui/textarea';
import { useToast } from '@/hooks/use-toast';
import { generateApiSuggestion, type ApiSuggestionOutput } from '@/ai/flows/api-suggestion-tool';
import { Loader2, Wand2, Key, FileJson, Shield } from 'lucide-react';
import { Separator } from '@/components/ui/separator';

const formSchema = z.object({
  existingApiConfigurations: z.string().min(50, 'Please provide more detail about existing configurations.'),
  newApiDescription: z.string().min(50, 'Please provide a more detailed description of the new API.'),
});

const exampleExistingConfig = `
Existing APIs connect to Nigerian telecom providers.
Example 1: MTN Airtime API
- Endpoint: POST https://api.mtn.com/v1/airtime
- Auth: Bearer token in Authorization header. API Key passed in 'x-api-key' header.
- Body: { "phoneNumber": "080...", "amount": 100, "transactionId": "..." }
- Response: { "status": "success", "reference": "..." }

Example 2: IKEDC Electricity API
- Endpoint: GET https://api.ikedc.com/v2/verify?meter=...
- Auth: Basic Auth
- Response: { "customerName": "...", "address": "..." }
`;

export function ApiConnectorClient() {
  const [result, setResult] = useState<ApiSuggestionOutput | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const { toast } = useToast();

  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      existingApiConfigurations: exampleExistingConfig.trim(),
      newApiDescription: '',
    },
  });

  async function onSubmit(values: z.infer<typeof formSchema>) {
    setIsLoading(true);
    setResult(null);
    try {
      const suggestion = await generateApiSuggestion(values);
      setResult(suggestion);
      toast({
        title: "Suggestions Generated!",
        description: "The AI has provided suggestions for your new API.",
      });
    } catch (error) {
      console.error(error);
      toast({
        variant: 'destructive',
        title: 'An Error Occurred',
        description: 'Failed to generate API suggestions. Please try again.',
      });
    } finally {
      setIsLoading(false);
    }
  }

  return (
    <div className="grid gap-8 lg:grid-cols-2">
      <Card>
        <CardHeader>
          <CardTitle>New API Definition</CardTitle>
          <CardDescription>Describe the new integration to get AI-powered suggestions.</CardDescription>
        </CardHeader>
        <CardContent>
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
              <FormField
                control={form.control}
                name="existingApiConfigurations"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Existing API Configurations</FormLabel>
                    <FormControl>
                      <Textarea
                        placeholder="Describe your current API setups..."
                        className="min-h-[200px] font-mono text-xs"
                        {...field}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="newApiDescription"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>New API Description</FormLabel>
                    <FormControl>
                      <Textarea
                        placeholder="e.g., 'A new API for purchasing WAEC result checker pins. It requires a transaction ID and should return a PIN and serial number.'"
                        className="min-h-[100px]"
                        {...field}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <Button type="submit" disabled={isLoading} className="w-full">
                {isLoading ? (
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                ) : (
                  <Wand2 className="mr-2 h-4 w-4" />
                )}
                Generate Suggestions
              </Button>
            </form>
          </Form>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>AI Suggestions</CardTitle>
          <CardDescription>Results will appear here after generation.</CardDescription>
        </CardHeader>
        <CardContent>
          {isLoading && (
            <div className="flex flex-col items-center justify-center h-full min-h-[300px] text-center">
              <Loader2 className="h-8 w-8 animate-spin text-primary" />
              <p className="mt-4 font-semibold">AI is thinking...</p>
              <p className="text-sm text-muted-foreground">Analyzing your requirements.</p>
            </div>
          )}
          {!isLoading && !result && (
             <div className="flex flex-col items-center justify-center h-full min-h-[300px] text-center p-4 rounded-lg border-2 border-dashed border-muted-foreground/30">
                <div className="flex h-16 w-16 items-center justify-center rounded-full bg-primary/10">
                    <Wand2 className="h-8 w-8 text-primary" />
                </div>
                <p className="mt-4 font-semibold">Waiting for input</p>
                <p className="text-sm text-muted-foreground max-w-xs mx-auto">Fill out the form on the left to get AI-powered suggestions for your new API integration.</p>
            </div>
          )}
          {result && (
            <div className="space-y-6">
                <SuggestionBlock icon={<Key className="h-5 w-5 text-primary" />} title="Suggested Parameters" content={result.suggestedParameters} />
                <Separator />
                <SuggestionBlock icon={<FileJson className="h-5 w-5 text-primary" />} title="Suggested Request Format" content={result.suggestedRequestFormat} />
                <Separator />
                <SuggestionBlock icon={<Shield className="h-5 w-5 text-primary" />} title="Suggested Security Measures" content={result.suggestedSecurityMeasures} />
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

function SuggestionBlock({ icon, title, content }: { icon: React.ReactNode, title: string, content: string }) {
    return (
        <div className="space-y-2">
            <div className="flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10">
                    {icon}
                </div>
                <h4 className="text-lg font-semibold">{title}</h4>
            </div>
            <div className="prose prose-sm max-w-none text-muted-foreground rounded-md border bg-secondary/50 p-4">
                <pre className="bg-transparent p-0 m-0 whitespace-pre-wrap font-sans">{content}</pre>
            </div>
        </div>
    )
}
