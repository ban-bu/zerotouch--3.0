import React, { useState, useEffect } from 'react';

/**
 * 动画过渡组件
 * 为子组件提供平滑的进入和退出动画效果
 * 
 * @param {Object} props
 * @param {React.ReactNode} props.children - 要应用动画的子组件
 * @param {string} props.type - 动画类型: 'fade', 'slide-up', 'slide-down', 'slide-left', 'slide-right', 'scale'
 * @param {number} props.duration - 动画持续时间(毫秒)
 * @param {boolean} props.show - 控制组件显示/隐藏的状态
 * @param {Function} props.onExited - 动画完全退出后的回调函数
 */
const AnimatedTransition = ({
  children,
  type = 'fade',
  duration = 300,
  show = true,
  onExited = () => {},
}) => {
  const [isVisible, setIsVisible] = useState(show);
  const [isAnimating, setIsAnimating] = useState(false);

  // 简化的动画类型映射
  const getAnimationClasses = (animationType, visible, animating) => {
    const baseClasses = 'transition-all duration-300 ease-in-out';
    
    if (!visible) return 'opacity-0 scale-95';
    
    switch (animationType) {
      case 'fade':
        return `${baseClasses} opacity-100`;
      case 'slide-up':
        return `${baseClasses} opacity-100 translate-y-0`;
      case 'slide-down':
        return `${baseClasses} opacity-100 translate-y-0`;
      case 'slide-left':
        return `${baseClasses} opacity-100 translate-x-0`;
      case 'slide-right':
        return `${baseClasses} opacity-100 translate-x-0`;
      case 'scale':
        return `${baseClasses} opacity-100 scale-100`;
      default:
        return `${baseClasses} opacity-100`;
    }
  };

  useEffect(() => {
    let timeoutId;
    
    if (show && !isVisible) {
      setIsVisible(true);
      setIsAnimating(true);
      
      // 短暂延迟后完成动画
      timeoutId = setTimeout(() => {
        setIsAnimating(false);
      }, 50);
    } else if (!show && isVisible) {
      setIsAnimating(true);
      
      timeoutId = setTimeout(() => {
        setIsVisible(false);
        setIsAnimating(false);
        onExited();
      }, duration);
    }

    return () => {
      clearTimeout(timeoutId);
    };
  }, [show, isVisible, duration, onExited]);

  if (!isVisible && !show) return null;

  const animationClasses = getAnimationClasses(type, show, isAnimating);

  return (
    <div className={animationClasses}>
      {children}
    </div>
  );
};

export default AnimatedTransition;