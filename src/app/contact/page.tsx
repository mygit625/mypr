
import type { Metadata } from 'next';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '@/components/ui/accordion';
import { Mail, Phone, MessageSquare, HelpCircle, Send } from 'lucide-react';

export const metadata: Metadata = {
  title: 'Contact Us',
  description: 'Get in touch with the ToolsInn team. We are here to help with any questions, feedback, or support requests you may have.',
};

const faqs = [
  {
    question: "Are all the tools on this website completely free?",
    answer: "Yes, absolutely. All tools currently available on ToolsInn are free to use. Our mission is to provide simple, accessible utilities without hidden costs or subscriptions."
  },
  {
    question: "Is my data safe and private when I use your tools?",
    answer: "We take your privacy very seriously. For most of our tools, your files are processed in your browser or are automatically deleted from our servers within one hour. We never sell your data. For more details, please review our Privacy Policy."
  },
  {
    question: "Do I need to create an account to use the tools?",
    answer: "No, an account is not required to use any of our tools. You can use them anonymously right away. Creating an account is an optional feature for users who may want to save their work or access future premium features."
  },
  {
    question: "I encountered an error while using a tool. What should I do?",
    answer: "We're sorry to hear that. Please use the contact form on this page to describe the issue you're facing. Include the name of the tool and any error messages you saw. This will help us resolve the problem quickly."
  }
];

export default function ContactPage() {
  return (
    <div className="space-y-16 pb-16">
      {/* Header */}
      <section className="text-center pt-12">
        <MessageSquare className="mx-auto h-16 w-16 text-primary mb-4" />
        <h1 className="text-4xl md:text-5xl font-bold tracking-tight">Get in Touch</h1>
        <p className="mt-4 text-lg md:text-xl text-muted-foreground max-w-3xl mx-auto">
          We're here to help! Whether you have a question, feedback, or a brilliant idea, we'd love to hear from you.
        </p>
      </section>

      {/* Contact Form and Info Section */}
      <section className="max-w-5xl mx-auto grid grid-cols-1 lg:grid-cols-2 gap-12">
        <div className="lg:col-span-1">
          <Card className="shadow-lg">
            <CardHeader>
              <CardTitle>Send us a message</CardTitle>
              <CardDescription>Fill out the form and we'll get back to you as soon as possible.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="name">Name</Label>
                  <Input id="name" placeholder="Your Name" />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="email">Email</Label>
                  <Input id="email" type="email" placeholder="your@email.com" />
                </div>
              </div>
              <div className="space-y-2">
                <Label htmlFor="subject">Subject</Label>
                <Input id="subject" placeholder="What is your message about?" />
              </div>
              <div className="space-y-2">
                <Label htmlFor="message">Message</Label>
                <Textarea id="message" placeholder="Type your message here..." rows={6} />
              </div>
              <Button size="lg" className="w-full">
                <Send className="mr-2 h-5 w-5" />
                Send Message
              </Button>
            </CardContent>
          </Card>
        </div>
        
        <div className="space-y-8">
            <div className="space-y-4">
                <h2 className="text-2xl font-semibold">Direct Contact</h2>
                <p className="text-muted-foreground">Prefer to reach out directly? Here’s how you can find us.</p>
            </div>
            <div className="space-y-4">
                <a href="mailto:info@toolsinn.com" className="group block">
                    <Card className="p-6 flex items-center gap-4 transition-all hover:border-primary hover:bg-primary/5">
                        <div className="bg-primary/10 p-3 rounded-full">
                            <Mail className="h-6 w-6 text-primary" />
                        </div>
                        <div>
                            <h3 className="font-semibold text-lg">Email Us</h3>
                            <p className="text-muted-foreground group-hover:text-primary transition-colors">info@toolsinn.com</p>
                        </div>
                    </Card>
                </a>
                <a href="https://wa.me/16177953747" target="_blank" rel="noopener noreferrer" className="group block">
                     <Card className="p-6 flex items-center gap-4 transition-all hover:border-primary hover:bg-primary/5">
                        <div className="bg-primary/10 p-3 rounded-full">
                            <Phone className="h-6 w-6 text-primary" />
                        </div>
                        <div>
                            <h3 className="font-semibold text-lg">WhatsApp</h3>
                            <p className="text-muted-foreground group-hover:text-primary transition-colors">+1 617 795 37 47</p>
                        </div>
                    </Card>
                </a>
            </div>
        </div>
      </section>

      {/* FAQ Section */}
      <section className="max-w-4xl mx-auto">
        <div className="text-center mb-12">
            <HelpCircle className="mx-auto h-12 w-12 text-primary mb-4" />
            <h2 className="text-3xl font-bold">Frequently Asked Questions</h2>
            <p className="mt-2 text-muted-foreground">Find quick answers to common questions below.</p>
        </div>
        <Accordion type="single" collapsible className="w-full">
          {faqs.map((faq, index) => (
            <AccordionItem key={index} value={`item-${index + 1}`}>
              <AccordionTrigger className="text-lg text-left">{faq.question}</AccordionTrigger>
              <AccordionContent className="text-base text-muted-foreground">
                {faq.answer}
              </AccordionContent>
            </AccordionItem>
          ))}
        </Accordion>
      </section>
    </div>
  );
}
