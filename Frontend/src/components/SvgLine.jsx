"use client";

import { motion, useAnimationControls } from "motion/react";
import { useState } from "react";
import * as React from "react";

export const AnimateSvg = ({
  width,
  height,
  viewBox,
  className,
  path,
  paths = [],
  strokeColor = "#cecece",
  strokeWidth = 3,
  strokeLinecap = "round",
  animationDuration = 1.5,
  animationDelay = 0,
  animationBounce = 0.3,
  staggerDelay = 0.2,
  reverseAnimation = false,
  enableHoverAnimation = false,
  hoverAnimationType = "redraw",
  hoverStrokeColor = "#4f46e5",
  initialAnimation = true,
}) => {
  const [isHovering, setIsHovering] = useState(false);

  const normalizedPaths = React.useMemo(() => {
    if (paths.length > 0) return paths;
    if (path) {
      return [
        {
          d: path,
          stroke: strokeColor,
          strokeWidth,
          strokeLinecap,
        },
      ];
    }
    return [];
  }, [paths, path, strokeColor, strokeWidth, strokeLinecap]);

  // Initial animation variants
  const getPathVariants = (index) => ({
    hidden: {
      pathLength: 0,
      opacity: 0,
      pathOffset: reverseAnimation ? 1 : 0,
    },
    visible: {
      pathLength: 1,
      opacity: 1,
      pathOffset: reverseAnimation ? 0 : 0,
      transition: {
        pathLength: {
          type: "spring",
          duration: animationDuration,
          bounce: animationBounce,
          delay: animationDelay + index * staggerDelay,
        },
        pathOffset: {
          duration: animationDuration,
          delay: animationDelay + index * staggerDelay,
        },
        opacity: {
          duration: animationDuration / 4,
          delay: animationDelay + index * staggerDelay,
        },
      },
    },
  });

  // Hover animation variants
  const getHoverVariants = (index) => {
    const baseDelay = index * 0.05;

    switch (hoverAnimationType) {
      case "float":
        return {
          hover: {
            y: [-2, -4, -2],
            transition: {
              duration: 2,
              repeat: Infinity,
              delay: baseDelay,
            },
          },
        };
      case "pulse":
        return {
          hover: {
            scale: [1, 1.05, 1],
            transition: {
              duration: 1.5,
              repeat: Infinity,
              delay: baseDelay,
            },
          },
        };
      case "redraw":
        return {
          hover: {
            pathLength: [0, 1],
            transition: {
              duration: animationDuration,
              delay: baseDelay,
            },
          },
        };
      case "color":
        return {
          hover: {
            stroke: hoverStrokeColor,
            transition: {
              duration: 0.3,
              delay: baseDelay,
            },
          },
        };
      case "sequential":
        return {
          hover: {
            pathLength: [0, 1],
            stroke: hoverStrokeColor,
            transition: {
              duration: animationDuration * 0.8,
              delay: baseDelay,
            },
          },
        };
      default:
        return {};
    }
  };

  return (
    <motion.svg
      width={width}
      height={height}
      viewBox={viewBox}
      className={className}
      onMouseEnter={() => enableHoverAnimation && setIsHovering(true)}
      onMouseLeave={() => enableHoverAnimation && setIsHovering(false)}
    >
      {normalizedPaths.map((pathData, index) => (
        <AnimatedPath
          key={index}
          pathData={pathData}
          index={index}
          strokeColor={strokeColor}
          strokeWidth={strokeWidth}
          strokeLinecap={strokeLinecap}
          initialAnimation={initialAnimation}
          pathVariants={getPathVariants(index)}
          isHovering={isHovering}
          hoverAnimationType={hoverAnimationType}
          hoverStrokeColor={hoverStrokeColor}
          totalPaths={normalizedPaths.length}
        />
      ))}
    </motion.svg>
  );
};

const AnimatedPath = ({
  pathData,
  index,
  strokeColor,
  strokeWidth,
  strokeLinecap,
  initialAnimation,
  pathVariants,
  isHovering,
  hoverAnimationType,
  hoverStrokeColor,
  totalPaths,
}) => {
  const controls = useAnimationControls();

  // FIX: Trigger the initial animation on mount
  React.useEffect(() => {
    if (initialAnimation) {
      controls.start("visible");
    } else {
      controls.set("visible"); // Instantly set to visible without animation
    }
  }, [controls, initialAnimation]);

  // Handle hover animations
  React.useEffect(() => {
    if (!initialAnimation && !isHovering) {
    } else if (isHovering) {
      const baseDelay = index * 0.05;

      switch (hoverAnimationType) {
        case "float":
          controls.start({
            y: [-2, -4, -2],
            transition: {
              duration: 2,
              repeat: Infinity,
              delay: baseDelay,
            },
          });
          break;
        case "pulse":
          controls.start({
            scale: [1, 1.05, 1],
            transition: {
              duration: 1.5,
              repeat: Infinity,
              delay: baseDelay,
            },
          });
          break;
        case "redraw":
          controls.start({
            pathLength: [0, 1],
            transition: {
              duration: 1.5,
              delay: baseDelay,
            },
          });
          break;
        case "color":
          controls.start({
            stroke: hoverStrokeColor,
            transition: {
              duration: 0.3,
              delay: baseDelay,
            },
          });
          break;
        case "sequential":
          controls.start({
            pathLength: [0, 1],
            stroke: hoverStrokeColor,
            transition: {
              duration: 1.2,
              delay: baseDelay,
            },
          });
          break;
      }
    } else {
      // When not hovering, revert to the visible state gracefully
      controls.start({
        y: 0,
        scale: 1,
        stroke: pathData.stroke || strokeColor,
        // Don't reset pathLength here, let the initial variant control it
      });
    }
  }, [
    isHovering,
    controls,
    hoverAnimationType,
    hoverStrokeColor,
    pathData.stroke,
    strokeColor,
    index,
    initialAnimation,
  ]);

  return (
    <motion.path
      d={pathData.d}
      stroke={pathData.stroke || strokeColor}
      strokeWidth={pathData.strokeWidth || strokeWidth}
      strokeLinecap={pathData.strokeLinecap || strokeLinecap}
      fill="none"
      variants={pathVariants}
      initial={initialAnimation ? "hidden" : "visible"}
      style={{
        filter: "drop-shadow(0 0 6px rgba(79, 70, 229, 0.3))",
      }}
      animate={controls}
    />
  );
};
