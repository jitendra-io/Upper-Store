import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import CrystalCore3D from '../components/CrystalCore3D';
import { ArrowRightIcon } from '../components/Icons';
import './Home.css';

const Home = () => {
  return (
    <div className="home-wrapper">
      {/* 1. ASYMMETRIC 2-COLUMN HERO SECTION */}
      <section className="home-hero-grid">
        {/* Left Column: Platform Mission & High-Conversion CTAs */}
        <div className="hero-left-column">
          <div className="hero-crimson-badge">
            <span className="crimson-badge-dot" />
            <span className="crimson-badge-text">Next-Gen Software Technology Platform</span>
          </div>

          <h1 className="hero-main-title">
            Powering the Future Through{' '}
            <span className="hero-title-crimson">Intelligent Software</span>
          </h1>

          <p className="hero-main-subtitle">
            Advanced digital software products combining ultra-low latency performance, neural intelligence, and device-bound security—engineered for teams operating at the frontier.
          </p>

          <div className="hero-actions-row">
            <Link to="/products" className="btn-crimson-primary">
              <span>Explore Catalog</span>
              <ArrowRightIcon size={16} />
            </Link>
            <Link to="/about" className="btn-glass-secondary">
              About Us
            </Link>
          </div>
        </div>

        {/* Right Column: Interactive 3D Crimson Crystalline Core */}
        <div className="hero-right-column">
          <CrystalCore3D />
        </div>
      </section>

      {/* 2. TELEMETRY & SYSTEM HEALTH METRICS RIBBON */}
      <section className="home-metrics-section">
        <div className="home-stats-ribbon">
          <div className="stat-card">
            <span className="stat-number">100%</span>
            <span className="stat-label">Verified Releases</span>
          </div>
          <div className="stat-divider" />
          <div className="stat-card">
            <span className="stat-number">95.05%</span>
            <span className="stat-label">System Uptime</span>
          </div>
          <div className="stat-divider" />
          <div className="stat-card">
            <span className="stat-number">ImageKit</span>
            <span className="stat-label">Global CDN Engine</span>
          </div>
          <div className="stat-divider" />
          <div className="stat-card">
            <span className="stat-number">SHA-256</span>
            <span className="stat-label">Package Protection</span>
          </div>
        </div>
      </section>
    </div>
  );
};

export default Home;
