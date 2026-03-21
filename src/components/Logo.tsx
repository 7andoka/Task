import React from 'react';

interface LogoProps {
  size?: number;
  className?: string;
}

export const Logo: React.FC<LogoProps & { showText?: boolean }> = ({ size = 32, className = "", showText = false }) => {
  const darkGreen = "#006B62";
  const limeGreen = "#A4C639";

  return (
    <div className={`flex flex-col items-center ${className}`}>
      <svg 
        width={size} 
        height={size} 
        viewBox="0 0 100 100" 
        fill="none" 
        xmlns="http://www.w3.org/2000/svg"
      >
        {/* Background Circle */}
        <circle cx="50" cy="50" r="50" fill={limeGreen} />
        
        {/* Left Dark Teal Half */}
        <path 
          d="M50 0C22.3858 0 0 22.3858 0 50C0 77.6142 22.3858 100 50 100V0Z" 
          fill={darkGreen} 
        />
        
        {/* White Leaf Cutout */}
        <path 
          d="M50 15C50 15 75 35 75 60C75 85 50 90 50 90C50 90 25 85 25 60C25 35 50 15 50 15Z" 
          fill="white" 
        />
        
        {/* Leaf Detail */}
        <path 
          d="M50 90C50 90 55 70 50 55C45 40 50 15 50 15" 
          stroke={darkGreen} 
          strokeWidth="3" 
          strokeLinecap="round"
        />
      </svg>
      
      {showText && (
        <div className="mt-4 text-center">
          <h1 className="text-4xl font-bold tracking-tight" style={{ color: darkGreen, fontFamily: 'serif' }}>
            Rich Land
          </h1>
          <p className="text-sm font-bold tracking-[0.2em] mt-1" style={{ color: darkGreen }}>
            FOOD INDUSTRIES
          </p>
        </div>
      )}
    </div>
  );
};

export default Logo;
