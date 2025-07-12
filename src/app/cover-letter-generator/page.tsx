"use client";

import { useState } from 'react';
import { useForm, type SubmitHandler } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { generateCoverLetterAction } from './actions';
import Link from 'next/link';

import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Slider } from '@/components/ui/slider';
import { Checkbox } from '@/components/ui/checkbox';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { ScrollArea } from '@/components/ui/scroll-area';
import { FileUploadZone } from '@/components/feature/file-upload-zone';
import { BrainCircuit, Loader2, Wand2, Copy, Download, Info, UploadCloud, PlusCircle, CheckCircle, Edit, Clock, Target, Sparkles, FolderUp, PenLine } from 'lucide-react';
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
  const [showResult, setShowResult] = useState(false);
  const { toast } = useToast();

  const {
    register,
    handleSubmit,
    control,
    setValue,
    watch,
    formState: { errors },
  } = useForm<FormValues>({
    resolver: zodResolver(FormSchema),
    defaultValues: {
      creativityLevel: 0.5,
      wittyRemark: false,
    },
  });

  const creativityLevelValue = watch('creativityLevel', 0.5);

  const handleFileSelected = (files: File[]) => {
    if (files.length > 0) {
      setCvFile(files[0]);
      setValue('cvFile', files[0], { shouldValidate: true });
    } else {
      setCvFile(null);
      setValue('cvFile', undefined, { shouldValidate: true });
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
    setShowResult(false);

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
      setShowResult(true);
      toast({ title: "Cover Letter Generated!", description: "Your personalized cover letter is ready below." });

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
  
  const howItWorksSteps = [
    { icon: UploadCloud, title: '1. Upload PDF CV', description: 'Start with your existing CV/Résumé.' },
    { icon: PlusCircle, title: '2. Add Job & Customize', description: 'Paste the description and adjust creativity level.' },
    { icon: CheckCircle, title: '3. Generate Draft', description: 'Let AI create a tailored first version in seconds.' },
    { icon: Edit, title: '4. Refine Instantly', description: 'Use inline tools to make it concise, detailed, etc.' },
  ];

  const whyChooseFeatures = [
    { icon: Clock, title: 'Save Hours, Not Just Minutes', description: 'Go from job description to a polished first draft in seconds, giving you more time to focus on applying.' },
    { icon: Target, title: 'Perfectly Tailored, Every Time', description: 'Use the Creativity Slider to find your unique tone and the Inline Editor to instantly refine wording, ensuring you sound like you and not AI.' },
    { icon: Sparkles, title: 'Effortless Polishing', description: "Don't struggle with finding the right words. Select any text and use the Inline Editor (Concise, Detailed, Professional, Informal) to reshape it instantly." },
    { icon: FolderUp, title: 'Leverage Your Existing CV', description: 'Simply upload your current CV/Résumé as a PDF. The AI uses it as the foundation, ensuring your experience is accurately reflected.' },
  ];

  return (
    <div className="space-y-16 md:space-y-24">
      <header className="text-center pt-8">
        <h1 className="text-4xl md:text-6xl font-bold tracking-tighter">Instant Cover Letters</h1>
        <p className="text-2xl md:text-3xl text-muted-foreground mt-2">That sound like you</p>
        <div className="mt-6 inline-flex items-center justify-center bg-muted/70 text-muted-foreground px-4 py-1.5 rounded-full text-sm">
          <Wand2 className="h-4 w-4 mr-2 text-primary" />
          <span>25,690 Letters Generated Worldwide! 🎉</span>
        </div>
      </header>

      <section>
        <Card className="max-w-3xl mx-auto p-4 sm:p-6 md:p-8 border-primary/20 shadow-lg bg-card/80 backdrop-blur-sm">
          <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
            <div>
              <h3 className="text-lg font-semibold mb-1">Job Info</h3>
              <div className="space-y-3">
                <Input {...register('jobTitle')} placeholder="Job title" aria-invalid={!!errors.jobTitle} />
                {errors.jobTitle && <p className="text-xs text-destructive">{errors.jobTitle.message}</p>}
                
                <Input {...register('company')} placeholder="Company" aria-invalid={!!errors.company} />
                {errors.company && <p className="text-xs text-destructive">{errors.company.message}</p>}

                <Input {...register('location')} placeholder="Location (optional)" />

                <Textarea {...register('jobDescription')} placeholder="Copy & paste the job description in any language" rows={6} aria-invalid={!!errors.jobDescription} />
                {errors.jobDescription && <p className="text-xs text-destructive">{errors.jobDescription.message}</p>}
              </div>
            </div>

            <div className="space-y-2">
              <h3 className="text-lg font-semibold">Upload CV</h3>
              <p className="text-sm text-muted-foreground">Upload a PDF only of Your CV/Resumé</p>
              <FileUploadZone onFilesSelected={handleFileSelected} multiple={false} accept="application/pdf" />
              {errors.cvFile && <p className="text-xs text-destructive mt-1">{errors.cvFile.message}</p>}
            </div>

            <div className="space-y-3">
              <Label>Cover letter creativity level</Label>
              <Slider
                defaultValue={[0.5]} min={0} max={1} step={0.1}
                value={[creativityLevelValue]}
                onValueChange={(value) => setValue('creativityLevel', value[0])}
              />
            </div>
            
            <div className="flex items-center space-x-2">
              <Checkbox id="witty-remark" {...register('wittyRemark')} />
              <Label htmlFor="witty-remark" className="font-normal text-sm">Include a witty remark at the end of the letter</Label>
            </div>

            <Button type="submit" size="lg" className="w-full text-base py-6" disabled={isGenerating}>
              {isGenerating ? (
                <><Loader2 className="mr-2 h-5 w-5 animate-spin" /> Generating...</>
              ) : (
                'Generate Cover Letter'
              )}
            </Button>
          </form>
        </Card>
      </section>

      {showResult && (
        <section id="results" className="max-w-3xl mx-auto">
          <Card className="shadow-lg">
            <CardHeader>
              <CardTitle>Your Generated Letter</CardTitle>
            </CardHeader>
            <CardContent>
              {error ? (
                <Alert variant="destructive">
                  <Info className="h-4 w-4" />
                  <AlertTitle>Error Generating Letter</AlertTitle>
                  <AlertDescription>{error}</AlertDescription>
                </Alert>
              ) : generatedLetter && (
                <>
                  <ScrollArea className="h-96 w-full rounded-md border p-4 text-sm whitespace-pre-wrap bg-background">
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
            </CardContent>
          </Card>
        </section>
      )}

      <section>
        <div className="text-center">
            <h2 className="text-3xl font-bold tracking-tight">How It Works</h2>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-4 gap-8 mt-12 max-w-5xl mx-auto">
          {howItWorksSteps.map(step => (
            <div key={step.title} className="flex flex-col items-center text-center">
              <div className="flex items-center justify-center h-12 w-12 rounded-full bg-primary/10 text-primary mb-4">
                <step.icon className="h-6 w-6"/>
              </div>
              <h3 className="font-semibold text-lg">{step.title}</h3>
              <p className="text-sm text-muted-foreground mt-1">{step.description}</p>
            </div>
          ))}
        </div>
      </section>
      
      <section>
        <div className="text-center">
            <h2 className="text-3xl font-bold tracking-tight">Why Choose Our Generator?</h2>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-x-8 gap-y-10 mt-12 max-w-4xl mx-auto">
          {whyChooseFeatures.map(feature => (
            <div key={feature.title} className="flex gap-4">
              <div className="flex-shrink-0">
                <div className="flex items-center justify-center h-10 w-10 rounded-lg bg-primary/10 text-primary">
                  <feature.icon className="h-6 w-6" />
                </div>
              </div>
              <div>
                <h3 className="font-semibold text-lg">{feature.title}</h3>
                <p className="text-sm text-muted-foreground mt-1">{feature.description}</p>
              </div>
            </div>
          ))}
        </div>
      </section>

      <section className="text-center py-12">
        <Card className="max-w-2xl mx-auto p-6 bg-muted/40 shadow-sm">
            <h3 className="text-2xl font-bold tracking-tight">Refine Your Message Instantly</h3>
            <p className="text-muted-foreground mt-2 mb-4">Highlight any part of your generated letter to easily adjust the tone and length. Make it yours, faster.</p>
            <div className="p-4 border rounded-lg bg-background text-sm text-left shadow-inner">
                ...I am confident that my extensive experience in project management and cross-functional team leadership makes me an <span className="bg-primary/20 text-primary-foreground p-1 rounded">exceptionally suitable candidate for this opportunity</span> and I am eager to discuss how my skills can benefit your organization...
            </div>
            <div className="mt-4 flex items-center justify-center gap-2">
                <PenLine className="h-4 w-4 text-muted-foreground"/>
                <p className="text-sm text-muted-foreground">Ask AI to make this part more...</p>
            </div>
            <div className="mt-3 flex justify-center gap-2">
                <Button variant="outline" size="sm">Concise</Button>
                <Button variant="outline" size="sm">Detailed</Button>
                <Button variant="outline" size="sm">Professional</Button>
                <Button variant="outline" size="sm">Informal</Button>
            </div>
        </Card>
      </section>

       <section className="text-center pb-12">
        <Button size="lg" className="text-lg py-6" asChild>
          <Link href="#top">Try Now</Link>
        </Button>
      </section>
    </div>
  );
}

    