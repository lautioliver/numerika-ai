import React, { createContext, useState, useContext, useCallback, useMemo } from 'react';

const IkaContext = createContext();

export const useIka = () => useContext(IkaContext);

export const IkaProvider = ({ children }) => {
    // Extra visual or structural context for the AI
    const [contextData, setContextData] = useState({
        page: 'Home',
        details: 'El usuario está explorando la página principal.'
    });

    // We can expose the function to let components update the context
    // Wrap with useCallback so it doesn't change on every render
    const updateContext = useCallback((page, details) => {
        setContextData(prev => {
            // Optimization: if it's the same, don't trigger state update
            if (prev.page === page && prev.details === details) return prev;
            return { page, details };
        });
    }, []);

    const value = useMemo(() => ({ contextData, updateContext }), [contextData, updateContext]);

    return (
        <IkaContext.Provider value={value}>
            {children}
        </IkaContext.Provider>
    );
};
