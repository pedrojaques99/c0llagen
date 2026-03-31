import React from 'react';
import { Github, Twitter, MessageSquare, ExternalLink } from 'lucide-react';

export const Footer: React.FC = () => {
  return (
    <footer className="mt-32 border-t border-border pt-20 pb-24 relative overflow-hidden">
      {/* Decorative bottom glow */}
      <div className="absolute bottom-0 left-1/2 -translate-x-1/2 w-[800px] h-[300px] bg-ink/[0.02] blur-[120px] rounded-full pointer-events-none" />
      
      <div className="max-w-[1400px] mx-auto px-8 relative z-10">
        <div className="grid grid-cols-1 md:grid-cols-12 gap-12 lg:gap-24">
          {/* Brand Column */}
          <div className="md:col-span-5 flex flex-col gap-8">
            <div className="flex flex-col">
              <h2 className="text-2xl font-bold tracking-tight text-ink leading-none">C0LLAGEN</h2>
              <span className="text-[10px] font-bold uppercase tracking-[0.3em] text-muted mt-3">Media Orchestration System</span>
            </div>
            <p className="text-sm text-muted max-w-sm leading-relaxed font-medium">
              Professional-grade media processing, AI-powered animation, and rapid rendering pipelines. 
              Engineered for precision, built for performance.
            </p>
            <div className="flex gap-3">
              <SocialLink icon={<Github size={18} />} href="#" label="Github" />
              <SocialLink icon={<Twitter size={18} />} href="#" label="Twitter" />
              <SocialLink icon={<MessageSquare size={18} />} href="#" label="Discord" />
            </div>
          </div>

          {/* Navigation Columns */}
          <div className="md:col-span-7 grid grid-cols-2 sm:grid-cols-3 gap-12">
            <LinkColumn title="Product">
              <FooterLink href="#">Features</FooterLink>
              <FooterLink href="#">AI Suite</FooterLink>
              <FooterLink href="#">Batch Render</FooterLink>
              <FooterLink href="#">Integration</FooterLink>
            </LinkColumn>

            <LinkColumn title="Resources">
              <FooterLink href="#">Documentation</FooterLink>
              <FooterLink href="#">Cloud API</FooterLink>
              <FooterLink href="#">Showcase</FooterLink>
              <FooterLink href="#">GitHub</FooterLink>
            </LinkColumn>

            <LinkColumn title="Status">
              <div className="flex items-center gap-2.5 text-[10px] font-bold uppercase tracking-widest text-emerald-500/80">
                <div className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse shadow-[0_0_8px_rgba(16,185,129,0.5)]" />
                All Systems Operational
              </div>
            </LinkColumn>
          </div>
        </div>

        {/* Bottom Bar */}
        <div className="mt-24 pt-8 border-t border-border flex flex-col md:flex-row justify-between items-center gap-6 text-[10px] font-bold uppercase tracking-[0.2em] text-muted">
          <div className="flex items-center gap-3">
            <span>© 2026 C0LLAGEN</span>
            <span className="w-1 h-1 rounded-full bg-border" />
            <span>BUILT WITH PRECISION</span>
          </div>
          <div className="flex gap-12">
            <a href="#" className="hover:text-ink transition-colors">Privacy Policy</a>
            <a href="#" className="hover:text-ink transition-colors">Terms of Service</a>
          </div>
        </div>
      </div>
    </footer>
  );
};

const SocialLink: React.FC<{ icon: React.ReactNode; href: string; label: string }> = ({ icon, href, label }) => (
  <a 
    href={href} 
    aria-label={label}
    className="w-11 h-11 rounded-2xl glass border border-border flex items-center justify-center text-muted hover:text-ink hover:border-border hover:bg-white/5 transition-all duration-300 group shadow-sm"
  >
    <div className="group-hover:scale-110 transition-transform duration-300">
      {icon}
    </div>
  </a>
);

const LinkColumn: React.FC<{ title: string; children: React.ReactNode }> = ({ title, children }) => (
  <div className="flex flex-col gap-7">
    <h3 className="text-[10px] font-bold uppercase tracking-[0.2em] text-ink/30">{title}</h3>
    <ul className="flex flex-col gap-4">
      {children}
    </ul>
  </div>
);

const FooterLink: React.FC<{ href: string; children: React.ReactNode }> = ({ href, children }) => (
  <li>
    <a 
      href={href} 
      className="text-[11px] font-bold uppercase tracking-wider text-muted hover:text-ink transition-colors flex items-center gap-1.5 group"
    >
      {children}
      <ExternalLink size={10} className="opacity-0 -translate-y-0.5 group-hover:opacity-40 transition-all" />
    </a>
  </li>
);
