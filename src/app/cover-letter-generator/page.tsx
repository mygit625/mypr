
"use client";

import { useState, useEffect } from 'react';
import { useForm, type SubmitHandler } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { generateCoverLetterAction } from './actions';
import Link from 'next/link';
import Image from 'next/image';

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
import { BrainCircuit, Loader2, Wand2, Copy, Download, Info, UploadCloud, PlusCircle, CheckCircle, Edit, Clock, Target, Sparkles, FolderUp, PenLine, Star } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { readFileAsDataURL } from '@/lib/file-utils';
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '@/components/ui/accordion';
import { cn } from '@/lib/utils';

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

const testimonials = [
  {
    name: 'Sarah J.',
    title: 'Software Engineer',
    quote: "I was struggling to write a cover letter that stood out. This tool helped me create a professional and personalized letter in minutes. I got three interview calls the same week!",
    imageSrc: 'https://placehold.co/100x100.png',
    rating: 5,
    'data-ai-hint': 'woman portrait',
  },
  {
    name: 'Michael B.',
    title: 'Marketing Manager',
    quote: "The creativity slider is a game-changer. I landed a job at a top creative agency after my cover letter, which this tool helped me write, was mentioned as a key reason they called me in!",
    imageSrc: 'https://placehold.co/100x100.png',
    rating: 5,
    'data-ai-hint': 'man portrait',
  },
  {
    name: 'Emily C.',
    title: 'Recent Graduate',
    quote: "As a recent grad with little experience, writing cover letters was daunting. This generator highlighted my skills from my CV perfectly. It gave me the confidence boost I needed.",
    imageSrc: 'https://placehold.co/100x100.png',
    rating: 5,
    'data-ai-hint': 'woman smiling',
  },
   {
    name: 'David L.',
    title: 'UX Designer',
    quote: "I hate writing cover letters. This tool made it painless. It parsed my PDF resume and the job description perfectly, creating a draft that was 90% ready to go. Huge time saver.",
    imageSrc: 'https://placehold.co/100x100.png',
    rating: 5,
    'data-ai-hint': 'man smiling',
  },
  {
    name: 'Maria G.',
    title: 'Project Manager',
    quote: "Switching careers is tough. This generator helped me frame my transferable skills in a way that made sense for the new role. The result was a compelling narrative that I couldn't have written on my own.",
    imageSrc: 'https://placehold.co/100x100.png',
    rating: 5,
    'data-ai-hint': 'woman professional',
  },
  {
    name: 'Kevin H.',
    title: 'Data Analyst',
    quote: "The ability to generate a formal and data-centric cover letter was amazing. I used the 'low creativity' setting, and it produced a perfectly toned letter for the financial industry.",
    imageSrc: 'https://placehold.co/100x100.png',
    rating: 5,
    'data-ai-hint': 'man glasses',
  },
  {
    name: 'Jessica W.',
    title: 'HR Coordinator',
    quote: "As someone who reads cover letters for a living, I was skeptical. But the quality is outstanding. It avoids clichés and focuses on matching skills to the job. I now recommend it to friends.",
    imageSrc: 'https://placehold.co/100x100.png',
    rating: 5,
    'data-ai-hint': 'woman business',
  },
  {
    name: 'Tom P.',
    title: 'Student',
    quote: "Needed a cover letter for an internship and had no idea where to start. Uploaded my resume, pasted the description, and got a fantastic draft. It helped me land the position!",
    imageSrc: 'https://placehold.co/100x100.png',
    rating: 5,
    'data-ai-hint': 'man student',
  },
  {
    name: 'Linda K.',
    title: 'Graphic Designer',
    quote: "I'm a visual person, not a writer. This tool helped me articulate my value proposition clearly and creatively. The 'witty remark' option was a nice touch for a creative role.",
    imageSrc: 'https://placehold.co/100x100.png',
    rating: 5,
    'data-ai-hint': 'woman artist',
  },
  {
    name: 'Brian T.',
    title: 'Sales Executive',
    quote: "In sales, the first impression is everything. This tool helped me craft a powerful opening that grabbed the recruiter's attention immediately. Saved me hours of work.",
    imageSrc: 'https://placehold.co/100x100.png',
    rating: 5,
    'data-ai-hint': 'man suit',
  },
];


export default function CoverLetterGeneratorPage() {
  const [cvFile, setCvFile] = useState<File | null>(null);
  const [isGenerating, setIsGenerating] = useState(false);
  const [generatedLetter, setGeneratedLetter] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [showResult, setShowResult] = useState(false);
  const { toast } = useToast();
  const [currentTestimonialIndex, setCurrentTestimonialIndex] = useState(0);

  useEffect(() => {
    const timer = setInterval(() => {
      setCurrentTestimonialIndex((prevIndex) => (prevIndex + 1) % testimonials.length);
    }, 5000); // Change testimonial every 5 seconds

    return () => clearInterval(timer); // Cleanup on component unmount
  }, []);

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
    { icon: Edit, title: '4. Refine & Download', description: 'Review the letter, copy, and download it instantly.' },
  ];

  const whyChooseFeatures = [
    { icon: Clock, title: 'Save Hours, Not Just Minutes', description: 'Go from job description to a polished first draft in seconds, giving you more time to focus on applying.' },
    { icon: Target, title: 'Perfectly Tailored, Every Time', description: 'Our AI analyzes your CV and the job description to highlight your most relevant skills and experiences, creating a unique letter for each application.' },
    { icon: Sparkles, title: 'Find Your Perfect Tone', description: "Use the Creativity Slider to shift from a highly formal tone to a more personal and creative one, ensuring you sound like you, not a robot." },
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

      <section className="max-w-4xl mx-auto text-center">
        <h2 className="text-3xl font-bold tracking-tight">Create a Winning Cover Letter in Seconds</h2>
        <div className="prose prose-lg text-muted-foreground mx-auto mt-4">
           <p>
            A great cover letter is your opportunity to make a strong first impression and stand out from other applicants. It bridges the gap between your resume and the job description, telling a compelling story about why you're the perfect fit. Our AI-powered cover letter generator helps you do just that, saving you valuable time and effort. Instead of staring at a blank page, you can generate a cover letter that is custom, well-written, and tailored to the job. This free cover letter generator gives you a powerful head start, empowering you to focus on what matters most: preparing for your interviews and landing your dream job.
           </p>
        </div>
      </section>
      
      <section className="py-16 md:py-24">
        <div className="container mx-auto max-w-4xl text-center">
          <h2 className="text-3xl font-bold tracking-tight">What Our Users Say</h2>
          <div className="mt-12 relative h-64 overflow-hidden">
            {testimonials.map((testimonial, index) => (
              <div
                key={index}
                className={cn(
                  'absolute inset-0 transition-opacity duration-1000 ease-in-out',
                  index === currentTestimonialIndex ? 'opacity-100' : 'opacity-0'
                )}
              >
                <div className="flex flex-col items-center">
                  <Image
                    src={testimonial.imageSrc}
                    alt={`Photo of ${testimonial.name}`}
                    width={80}
                    height={80}
                    className="rounded-full mb-4"
                    data-ai-hint={testimonial['data-ai-hint']}
                  />
                  <div className="flex items-center mb-2">
                    {[...Array(testimonial.rating)].map((_, i) => (
                      <Star key={i} className="h-5 w-5 text-yellow-400 fill-current" />
                    ))}
                  </div>
                  <blockquote className="text-lg italic text-foreground max-w-2xl">
                    "{testimonial.quote}"
                  </blockquote>
                  <p className="mt-4 font-semibold text-foreground">{testimonial.name}</p>
                  <p className="text-sm text-muted-foreground">{testimonial.title}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

       <section className="max-w-4xl mx-auto py-12 px-4">
        <h2 className="text-3xl font-bold text-center mb-8">Frequently Asked Questions</h2>
        <Accordion type="single" collapsible className="w-full">
          <AccordionItem value="item-1">
            <AccordionTrigger>Is this cover letter generator free to use?</AccordionTrigger>
            <AccordionContent>
              Yes, our AI Cover Letter Generator is completely free. We believe in providing accessible tools to help everyone in their job search without any hidden costs or subscriptions.
            </AccordionContent>
          </AccordionItem>
          <AccordionItem value="item-2">
            <AccordionTrigger>Can I use this for any industry or job role?</AccordionTrigger>
            <AccordionContent>
              Absolutely. Our tool is designed to be versatile. By analyzing the job description and your CV, the AI adapts to any industry, from tech and finance to creative arts and healthcare, crafting a suitable and relevant letter.
            </AccordionContent>
          </AccordionItem>
          <AccordionItem value="item-3">
            <AccordionTrigger>How does the AI ensure my cover letter is unique?</AccordionTrigger>
            <AccordionContent>
              The AI combines the specific details from the job description you provide with the unique skills and experiences listed in your CV. This dual-source approach ensures every generated letter is tailored to the specific application, avoiding generic templates.
            </AccordionContent>
          </AccordionItem>
          <AccordionItem value="item-4">
            <AccordionTrigger>Is my personal data safe?</AccordionTrigger>
            <AccordionContent>
              We prioritize your privacy. The data you upload is used solely for the purpose of generating your cover letter and is not stored or shared. You can use our tools with confidence, knowing your information is secure.
            </AccordionContent>
          </AccordionItem>
        </Accordion>
      </section>

       <section className="text-center pb-12">
        <Button size="lg" className="text-lg py-6" asChild>
          <Link href="#top">Try Now for Free</Link>
        </Button>
      </section>
    </div>
  );
}

    