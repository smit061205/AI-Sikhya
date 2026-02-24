import React, { createContext, useState, useContext } from "react";

// 1. Create the context
const ExploreDropdownContext = createContext();

// 2. Create a custom hook for easy consumption
export const useExploreDropdown = () => {
  return useContext(ExploreDropdownContext);
};

// 3. Create the Provider component
export const ExploreDropdownProvider = ({ children }) => {
  const [isExploreOpen, setExploreOpen] = useState(false);

  const value = {
    isExploreOpen,
    setExploreOpen,
  };

  return (
    <ExploreDropdownContext.Provider value={value}>
      {children}
    </ExploreDropdownContext.Provider>
  );
};
