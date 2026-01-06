import React, { useState, useRef, useEffect } from 'react';

const LazyImage = ({ src, alt, style, placeholder, ...props }) => {
  const [isLoaded, setIsLoaded] = useState(false);
  const [isInView, setIsInView] = useState(false);
  const imgRef = useRef(null);

  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            setIsInView(true);
            observer.disconnect();
          }
        });
      },
      { threshold: 0.1 }
    );

    if (imgRef.current) {
      observer.observe(imgRef.current);
    }

    return () => {
      if (imgRef.current) {
        observer.unobserve(imgRef.current);
      }
    };
  }, []);

  const defaultPlaceholder = (
    <div
      style={{
        ...style,
        background: 'rgba(193, 4, 104, 0.2)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        color: '#FF36A3',
        fontFamily: "'Protest Riot', sans-serif",
        fontSize: '0.8rem'
      }}
    >
      ⏳
    </div>
  );

  return (
    <div ref={imgRef} style={{ position: 'relative', ...style }}>
      {!isLoaded && (placeholder || defaultPlaceholder)}
      {isInView && (
        <img
          src={src}
          alt={alt}
          style={{
            ...style,
            display: isLoaded ? 'block' : 'none',
            transition: 'opacity 0.3s ease'
          }}
          onLoad={() => setIsLoaded(true)}
          loading="lazy"
          {...props}
        />
      )}
    </div>
  );
};

export default LazyImage;

