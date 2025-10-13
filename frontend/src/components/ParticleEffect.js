import React, { useEffect, useState } from 'react';

const ParticleEffect = ({ show, onComplete, particleCount = 10 }) => {
  const [particles, setParticles] = useState([]);

  useEffect(() => {
    if (show) {
      const newParticles = [];
      for (let i = 0; i < particleCount; i++) {
        newParticles.push({
          id: i,
          x: Math.random() * 100,
          y: Math.random() * 100,
          emoji: ['💰', '⛏️', '💎', '⭐', '🎉'][Math.floor(Math.random() * 5)],
          delay: Math.random() * 0.5
        });
      }
      setParticles(newParticles);
      
      // Auto complete after animation
      setTimeout(() => {
        setParticles([]);
        if (onComplete) onComplete();
      }, 2500);
    }
  }, [show, particleCount, onComplete]);

  if (!show || particles.length === 0) return null;

  return (
    <div className="fixed inset-0 pointer-events-none z-50">
      {particles.map((particle) => (
        <div
          key={particle.id}
          className="reward-particle"
          style={{
            left: `${particle.x}%`,
            top: `${particle.y}%`,
            animationDelay: `${particle.delay}s`
          }}
        >
          {particle.emoji}
        </div>
      ))}
    </div>
  );
};

export default ParticleEffect; 