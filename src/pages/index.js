import React from "react";
import {
  AboutSection,
  ArticlesSection,
  ContactSection,
  HeroSection,
  InterestsSection,
  Page,
  ProjectsSection,
  Seo,
} from "gatsby-theme-portfolio-minimal";

export default function IndexPage() {
  return (
    <>
      <Seo title="ideaSquared's website" />
      <Page useSplashScreenAnimation>
        <HeroSection sectionId="hero" />
        <ArticlesSection sectionId="blog" heading="Latest Blog" sources={['Blog']} />
        <AboutSection sectionId="about" heading="About Us" />
        {/* <InterestsSection sectionId="details" heading="Details" /> */}
        {/* <ProjectsSection sectionId="features" heading="Built-in Features" /> */}
        <ContactSection sectionId="github" heading="Contact Us?" />
      </Page>
    </>
  );
}
