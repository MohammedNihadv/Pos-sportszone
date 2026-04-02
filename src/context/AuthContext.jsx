import React, { createContext, useContext, useState } from 'react';

const AuthContext = createContext();

export const AuthProvider = ({ children }) => {
  const [isOwner, setIsOwner] = useState(false);

  const loginAdmin = async (pin) => {
    try {
      const isValid = await window.electron.invoke('verify-pin', pin);
      if (isValid) {
        setIsOwner(true);
        return true;
      }
      return false;
    } catch (err) {
      console.error('Login error:', err);
      return false;
    }
  };

  const logoutAdmin = () => {
    setIsOwner(false);
  };

  const updatePin = async (newPin) => {
    if (!isOwner) return false;
    try {
      return await window.electron.invoke('update-pin', newPin);
    } catch (error) {
      console.error('Update PIN Error:', error);
      return false;
    }
  }

  return (
    <AuthContext.Provider value={{ isOwner, loginAdmin, logoutAdmin, updatePin }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => useContext(AuthContext);
