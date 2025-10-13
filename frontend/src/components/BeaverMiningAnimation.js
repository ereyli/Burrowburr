import React, { useEffect, useRef } from 'react';

const BeaverMiningAnimation = () => {
  const canvasRef = useRef(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');
    let animationId;
    let beaverImage = new Image();
    beaverImage.src = '/logo192.png';

    // Canvas setup
    canvas.width = 600;
    canvas.height = 350;

    // Animation state
    let frame = 0;
    let beaverX = 480;
    let beaverY = 250;
    let beaverScale = 0.35;
    let isUnderground = false;
    let undergroundTime = 0;
    let tokens = [];
    let burrowDirt = [];
    let miningProgress = 0;
    let burrowTextOpacity = 0;
    
    // Walking animation variables
    let walkCycle = 0;
    let jumpHeight = 0;
    let bounceOffset = 0;
    let tailWag = 0;
    let headBob = 0;

    // Burrow position (left side)
    const BURROW_X = 120;
    const BURROW_Y = 320;

    // Colors matching site theme
    const colors = {
      beaver: '#8B4513',
      burrow: '#654321',
      dirt: '#8B7355',
      token: '#FFA500',
      background: 'transparent'
    };

    // Create burrow dirt particles
    for (let i = 0; i < 20; i++) {
      burrowDirt.push({
        x: BURROW_X - 10 + Math.random() * 20,
        y: BURROW_Y + Math.random() * 10,
        vx: (Math.random() - 0.5) * 2,
        vy: -Math.random() * 3,
        life: 0
      });
    }

    // Create token class
    class Token {
      constructor(x, y) {
        this.x = x;
        this.y = y;
        this.vx = (Math.random() - 0.5) * 4;
        this.vy = -Math.random() * 8 - 2;
        this.rotation = 0;
        this.rotationSpeed = (Math.random() - 0.5) * 0.2;
        this.gravity = 0.3;
        this.bounce = 0.7;
        this.life = 0;
      }

      update() {
        this.x += this.vx;
        this.y += this.vy;
        this.vy += this.gravity;
        this.rotation += this.rotationSpeed;
        this.life++;

        // Bounce off ground
        if (this.y > 330) {
          this.y = 330;
          this.vy *= -this.bounce;
        }

        // Bounce off walls
        if (this.x < 0 || this.x > 600) {
          this.vx *= -0.8;
        }
      }

      draw(ctx) {
        ctx.save();
        ctx.translate(this.x, this.y);
        ctx.rotate(this.rotation);
        
        // Draw BURR token
        ctx.fillStyle = colors.token;
        ctx.beginPath();
        ctx.arc(0, 0, 8, 0, Math.PI * 2);
        ctx.fill();
        
        // Draw BURR text
        ctx.fillStyle = '#000';
        ctx.font = 'bold 8px Arial';
        ctx.textAlign = 'center';
        ctx.fillText('B', 0, 2);
        
        ctx.restore();
      }
    }

    // Draw beaver with walking animation
    const drawBeaver = (x, y, underground = false, scale = beaverScale) => {
      if (beaverImage.complete) {
        ctx.save();
        
        // Add walking bounce
        const walkBounce = Math.sin(walkCycle) * 2;
        const jumpOffset = Math.sin(jumpHeight) * 5;
        const headBobOffset = Math.sin(headBob) * 1;
        
        ctx.translate(x, y + walkBounce + jumpOffset + headBobOffset);
        
        // Add slight rotation for walking effect
        const walkRotation = Math.sin(walkCycle * 2) * 0.1;
        ctx.rotate(walkRotation);
        
        if (underground) {
          // When underground, draw only a small part (head)
          ctx.scale(scale * 0.5, scale * 0.5);
          ctx.drawImage(beaverImage, -beaverImage.width/2, -beaverImage.height/2);
        } else {
          // Normal size when above ground, but slightly smaller
          ctx.scale(scale * 0.8, scale * 0.8);
          ctx.drawImage(beaverImage, -beaverImage.width/2, -beaverImage.height/2);
        }
        
        ctx.restore();
        
        // Draw walking dust particles
        if (!underground && Math.abs(walkBounce) > 1) {
          ctx.fillStyle = colors.dirt;
          for (let i = 0; i < 3; i++) {
            const dustX = x + (Math.random() - 0.5) * 20;
            const dustY = y + 20 + Math.random() * 5;
            ctx.fillRect(dustX, dustY, 1, 1);
          }
        }
      }
    };

    // Draw burrow
    const drawBurrow = () => {
      ctx.fillStyle = colors.burrow;
      ctx.beginPath();
      ctx.arc(BURROW_X, BURROW_Y, 70, 0, Math.PI, true);
      ctx.fill();
      
      // Draw burrow entrance
      ctx.fillStyle = colors.dirt;
      ctx.fillRect(BURROW_X - 70, BURROW_Y, 140, 25);
      
      // Draw orange fire-like lights on both sides of entrance
      const fireIntensity = Math.sin(frame * 0.15) * 0.4 + 0.6; // More dynamic fire effect
      
      // Left fire light
      ctx.fillStyle = `rgba(255, 165, 0, ${fireIntensity * 0.9})`;
      ctx.beginPath();
      ctx.arc(BURROW_X - 65, BURROW_Y - 5, 15, 0, Math.PI * 2);
      ctx.fill();
      
      // Right fire light
      ctx.fillStyle = `rgba(255, 165, 0, ${fireIntensity * 0.9})`;
      ctx.beginPath();
      ctx.arc(BURROW_X + 65, BURROW_Y - 5, 15, 0, Math.PI * 2);
      ctx.fill();
      
      // Fire glow effects
      ctx.fillStyle = `rgba(255, 140, 0, ${fireIntensity * 0.5})`;
      ctx.beginPath();
      ctx.arc(BURROW_X - 65, BURROW_Y - 5, 22, 0, Math.PI * 2);
      ctx.fill();
      
      ctx.beginPath();
      ctx.arc(BURROW_X + 65, BURROW_Y - 5, 22, 0, Math.PI * 2);
      ctx.fill();
      
      // Draw dirt particles around burrow
      for (let i = 0; i < 15; i++) {
        const angle = (i / 15) * Math.PI * 2;
        const radius = 75 + Math.sin(frame * 0.1 + i) * 5;
        const x = BURROW_X + Math.cos(angle) * radius;
        const y = BURROW_Y + Math.sin(angle) * radius;
        
        ctx.fillStyle = colors.dirt;
        ctx.fillRect(x, y, 2, 2);
      }
      
      // Draw BURROW sign as wooden arrow sign (permanent)
          const arrowX = 570; // Position at far right, slightly left
    const arrowY = BURROW_Y - 10;
      
      // Wooden sign background (rectangular with arrow tip) - bigger
      ctx.fillStyle = '#D2691E'; // Wooden brown color
      ctx.beginPath();
      ctx.moveTo(arrowX - 60, arrowY - 20); // Left side (arrow tip) - bigger
      ctx.lineTo(arrowX + 40, arrowY - 20); // Top - wider
      ctx.lineTo(arrowX + 40, arrowY + 20); // Right side - wider
      ctx.lineTo(arrowX - 60, arrowY + 20); // Bottom - bigger
      ctx.closePath();
      ctx.fill();
      
      // Wooden sign border
      ctx.strokeStyle = '#8B4513';
      ctx.lineWidth = 2;
      ctx.stroke();
      
      // Direction arrow pointing to burrow
      ctx.fillStyle = '#000000'; // Black for direction
      ctx.beginPath();
      ctx.moveTo(arrowX - 60, arrowY);
      ctx.lineTo(arrowX - 45, arrowY - 12);
      ctx.lineTo(arrowX - 45, arrowY + 12);
      ctx.closePath();
      ctx.fill();
      
      // BURROW text inside the sign
      ctx.fillStyle = 'rgba(255, 255, 255, 1)';
      ctx.font = 'bold 14px Arial'; // Bigger font
      ctx.textAlign = 'center';
      ctx.fillText('BURROW', arrowX - 10, arrowY + 6);
      
      // Sign pole/stick under the sign
      ctx.fillStyle = '#8B4513'; // Dark brown for pole
      ctx.fillRect(arrowX - 5, arrowY + 20, 10, 30); // Pole under sign
      
      // Pole border
      ctx.strokeStyle = '#654321';
      ctx.lineWidth = 1;
      ctx.strokeRect(arrowX - 5, arrowY + 20, 10, 30);
    };

    // Draw mining particles
    const drawMiningParticles = () => {
      // Empty function - no mining particles
    };

    // Animation loop
    const animate = () => {
      ctx.clearRect(0, 0, canvas.width, canvas.height);

      // Draw ground
      ctx.fillStyle = colors.dirt;
      ctx.fillRect(0, 330, 600, 20);

      // Draw burrow
      drawBurrow();

      // Update animation variables
      walkCycle += 0.3;
      jumpHeight += 0.2;
      headBob += 0.4;
      tailWag += 0.5;

      // Update burrow dirt particles
      burrowDirt.forEach(dirt => {
        dirt.x += dirt.vx;
        dirt.y += dirt.vy;
        dirt.vy += 0.1;
        dirt.life++;
        
        if (dirt.life < 30) {
          ctx.fillStyle = colors.dirt;
          ctx.fillRect(dirt.x, dirt.y, 2, 2);
        }
      });

      // Animation phases
      if (frame < 50) {
        // Phase 1: Beaver walking from right to left towards burrow (faster)
        beaverX = 480 - (frame / 50) * (480 - BURROW_X);
        beaverY = 250;
        drawBeaver(beaverX, beaverY, false);
        burrowTextOpacity = frame / 50;
        
        // Add excitement when approaching burrow
        if (frame > 35) {
          jumpHeight += 0.08;
        }
      } else if (frame < 100) {
        // Phase 2: Beaver going underground - move towards burrow entrance (faster)
        beaverX = BURROW_X + 30 - (frame - 50) / 50 * 30;
        beaverY = 250;
        isUnderground = true;
        undergroundTime = 0;
        drawBeaver(beaverX, beaverY, true);
        burrowTextOpacity = 1;
        
        // Add dirt particles
        if (frame % 4 === 0) {
          burrowDirt.push({
            x: beaverX - 15,
            y: BURROW_Y,
            vx: (Math.random() - 0.5) * 2,
            vy: -Math.random() * 3,
            life: 0
          });
        }
      } else if (frame < 180) {
        // Phase 3: Beaver completely underground (medium mining time)
        isUnderground = true;
        undergroundTime++;
        burrowTextOpacity = 1;
        
        // Don't draw beaver - it's completely underground
        drawMiningParticles();
        miningProgress = (frame - 100) / 80;
        
        // Add mining particles
        if (frame % 12 === 0) {
          burrowDirt.push({
            x: BURROW_X + (Math.random() - 0.5) * 20,
            y: BURROW_Y - 10 + Math.random() * 10,
            vx: (Math.random() - 0.5) * 2,
            vy: -Math.random() * 3,
            life: 0
          });
        }
      } else if (frame < 230) {
        // Phase 4: Beaver coming out of burrow with excitement (faster)
        beaverX = BURROW_X + 60 - (frame - 180) / 50 * 30; // More to the right
        beaverY = 250;
        isUnderground = false;
        drawBeaver(beaverX, beaverY, false);
        burrowTextOpacity = 1;
        
        // Add extra bounce when coming out
        jumpHeight += 0.12;
        
        // Throw tokens
        if (frame % 8 === 0 && frame < 210) {
          for (let i = 0; i < 8; i++) {
            tokens.push(new Token(beaverX - 15, beaverY));
          }
        }
      } else {
        // Phase 5: Idle state with playful movements (medium idle)
        beaverX = 300; // Center of canvas
        beaverY = 250;
        drawBeaver(beaverX, beaverY, false);
        burrowTextOpacity = 0.5;
        
        // Add playful movements
        if (frame % 80 === 0) {
          // Occasional jump (medium frequency)
          jumpHeight += 0.4;
        }
        
        // Reset animation (medium cycle)
        if (frame > 400) {
          frame = 0;
          tokens = [];
          burrowDirt = [];
          miningProgress = 0;
          undergroundTime = 0;
          walkCycle = 0;
          jumpHeight = 0;
          headBob = 0;
        }
      }

      // Update and draw tokens
      tokens.forEach((token, index) => {
        token.update();
        token.draw(ctx);
        
        // Remove old tokens (faster cleanup)
        if (token.life > 80) {
          tokens.splice(index, 1);
        }
      });

      // Draw mining progress bar
      if (frame >= 160 && frame <= 280) {
        ctx.fillStyle = colors.token;
        ctx.fillRect(50, 50, miningProgress * 200, 10);
        ctx.strokeStyle = '#fff';
        ctx.strokeRect(50, 50, 200, 10);
        
        // Add mining text
        ctx.fillStyle = '#fff';
        ctx.font = 'bold 12px Arial';
        ctx.textAlign = 'center';
        ctx.fillText('MINING BURR TOKENS...', 150, 40);
      }

      frame++;
      animationId = setTimeout(animate, 40); // 25 FPS for medium speed
    };

    animate();

    return () => {
      clearTimeout(animationId);
    };
  }, []);

  return (
    <div style={{
      display: 'flex',
      justifyContent: 'center',
      alignItems: 'center',
      margin: '20px 0'
    }}>
      <canvas
        ref={canvasRef}
        style={{
          border: '2px solid var(--accent-orange)',
          borderRadius: '10px',
          backgroundColor: 'var(--bg-dark)',
          maxWidth: '100%',
          height: 'auto'
        }}
      />
    </div>
  );
};

export default BeaverMiningAnimation; 