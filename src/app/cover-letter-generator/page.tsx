"use client";

import { useState } from 'react';
import { useForm, type SubmitHandler } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { generateCoverLetterAction } from './actions';

import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Slider } from '@/components/ui/slider';
import { Switch } from '@/components/ui/switch';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { ScrollArea } from '@/components/ui/scroll-area';
import { FileUploadZone } from '@/components/feature/file-upload-zone';
import { BrainCircuit, Loader2, Wand2, Copy, Download, Info } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { readFileAsDataURL } from '@/lib/file-utils';

const FormSchema = z.object({
  jobTitle: z.string().min(2, { message: 'Job title is required.' }),
  company: z.string().min(2, { message: 'Company name is required.' }),
  location: z.string().optional(),
  jobDescription: z.string().min(20, { message: 'Job description must be at least 20 characters.' }),
  creativityLevel: z.number().min(0).max(1),
  wittyRemark: z.boolean(),
  cvFile: z.instanceof(File).optional(),
});

type FormValues = z.infer<typeof FormSchema>;

export default function CoverLetterGeneratorPage() {
  const [cvFile, setCvFile] = useState<File | null>(null);
  const [isGenerating, setIsGenerating] = useState(false);
  const [generatedLetter, setGeneratedLetter] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const { toast } = useToast();

  const {
    register,
    handleSubmit,
    control,
    setValue,
    formState: { errors },
  } = useForm<FormValues>({
    resolver: zodResolver(FormSchema),
    defaultValues: {
      creativityLevel: 0.5,
      wittyRemark: false,
    },
  });

  const handleFileSelected = (files: File[]) => {
    if (files.length > 0) {
      setCvFile(files[0]);
      setValue('cvFile', files[0]);
    } else {
      setCvFile(null);
      setValue('cvFile', undefined);
    }
  };

  const onSubmit: SubmitHandler<FormValues> = async (data) => {
    if (!cvFile) {
      toast({ title: "CV/Resume Missing", description: "Please upload your CV or resume.", variant: "destructive" });
      return;
    }

    setIsGenerating(true);
    setError(null);
    setGeneratedLetter(null);

    try {
      const cvDataUri = await readFileAsDataURL(cvFile);
      const result = await generateCoverLetterAction({
        jobTitle: data.jobTitle,
        company: data.company,
        location: data.location || '',
        jobDescription: data.jobDescription,
        cvDataUri,
        creativityLevel: data.creativityLevel,
        wittyRemark: data.wittyRemark,
      });

      if (result.error) {
        throw new Error(result.error);
      }

      setGeneratedLetter(result.coverLetter!);
      toast({ title: "Cover Letter Generated!", description: "Your personalized cover letter is ready." });

    } catch (e: any) {
      setError(e.message || "An unexpected error occurred.");
      toast({ title: "Generation Failed", description: e.message, variant: "destructive" });
    } finally {
      setIsGenerating(false);
    }
  };

  const copyToClipboard = () => {
    if (!generatedLetter) return;
    navigator.clipboard.writeText(generatedLetter);
    toast({ description: "Cover letter copied to clipboard!" });
  };

  const downloadAsTxt = () => {
    if (!generatedLetter) return;
    const blob = new Blob([generatedLetter], { type: 'text/plain;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = 'cover-letter.txt';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  return (
    <div className="max-w-4xl mx-auto space-y-8">
      <header className="text-center">
        <BrainCircuit className="mx-auto h-16 w-16 text-primary mb-4" />
        <h1 className="text-4xl font-bold tracking-tight">AI Cover Letter Generator</h1>
        <p className="text-lg text-muted-foreground mt-2 max-w-2xl mx-auto">
          Create professional cover letters that sound like you, in an instant.
        </p>
      </header>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
        <Card className="shadow-lg">
          <CardHeader>
            <CardTitle>Job Information</CardTitle>
            <CardDescription>Fill in the details about the job you're applying for.</CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
              <Input {...register('jobTitle')} placeholder="Job Title" aria-invalid={!!errors.jobTitle} />
              {errors.jobTitle && <p className="text-xs text-destructive">{errors.jobTitle.message}</p>}

              <Input {...register('company')} placeholder="Company" aria-invalid={!!errors.company} />
              {errors.company && <p className="text-xs text-destructive">{errors.company.message}</p>}

              <Input {...register('location')} placeholder="Location (optional)" />

              <Textarea {...register('jobDescription')} placeholder="Copy & paste the job description here" rows={6} aria-invalid={!!errors.jobDescription} />
              {errors.jobDescription && <p className="text-xs text-destructive">{errors.jobDescription.message}</p>}
              
              <div>
                <Label>Upload CV/Resumé</Label>
                <FileUploadZone onFilesSelected={handleFileSelected} multiple={false} accept="application/pdf" />
                {errors.cvFile && <p className="text-xs text-destructive mt-1">{errors.cvFile.message}</p>}
              </div>

              <div className="space-y-2 pt-2">
                <Label>Creativity Level: {Math.round(control._formValues.creativityLevel * 100)}%</Label>
                <Slider
                  defaultValue={[0.5]}
                  min={0} max={1} step={0.1}
                  onValueChange={(value) => setValue('creativityLevel', value[0])}
                />
              </div>

              <div className="flex items-center space-x-2">
                <Switch id="witty-remark" {...register('wittyRemark')} />
                <Label htmlFor="witty-remark">Include a witty remark at the end</Label>
              </div>

              <Button type="submit" size="lg" className="w-full" disabled={isGenerating}>
                {isGenerating ? (
                  <>
                    <Loader2 className="mr-2 h-5 w-5 animate-spin" /> Generating...
                  </>
                ) : (
                  <>
                    <Wand2 className="mr-2 h-5 w-5" /> Generate Cover Letter
                  </>
                )}
              </Button>
            </form>
          </CardContent>
        </Card>

        <div className="space-y-4">
          <Card className="shadow-lg h-full">
            <CardHeader>
              <CardTitle>Your Cover Letter</CardTitle>
              <CardDescription>Your generated letter will appear below.</CardDescription>
            </CardHeader>
            <CardContent>
              {isGenerating && (
                <div className="flex flex-col items-center justify-center h-64 rounded-lg border border-dashed">
                  <Loader2 className="h-10 w-10 text-primary animate-spin" />
                  <p className="text-muted-foreground mt-4">Crafting your letter...</p>
                </div>
              )}
              {error && (
                <Alert variant="destructive">
                  <Info className="h-4 w-4" />
                  <AlertTitle>Error Generating Letter</AlertTitle>
                  <AlertDescription>{error}</AlertDescription>
                </Alert>
              )}
              {generatedLetter && (
                <>
                  <ScrollArea className="h-96 w-full rounded-md border p-4 text-sm whitespace-pre-wrap">
                    {generatedLetter}
                  </ScrollArea>
                  <div className="mt-4 flex gap-2">
                    <Button onClick={copyToClipboard} variant="outline" className="flex-1">
                      <Copy className="mr-2 h-4 w-4" /> Copy
                    </Button>
                    <Button onClick={downloadAsTxt} variant="outline" className="flex-1">
                      <Download className="mr-2 h-4 w-4" /> Download .txt
                    </Button>
                  </div>
                </>
              )}
              {!isGenerating && !generatedLetter && !error && (
                <div className="flex items-center justify-center h-64 border border-dashed rounded-lg">
                  <p className="text-muted-foreground">Fill out the form to generate your letter.</p>
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
