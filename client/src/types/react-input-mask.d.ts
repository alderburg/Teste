declare module 'react-input-mask' {
  import React from 'react';
  
  interface InputMaskProps {
    mask: string;
    maskChar?: string | null;
    formatChars?: { [key: string]: string };
    alwaysShowMask?: boolean;
    inputRef?: React.Ref<HTMLInputElement>;
    onBlur?: (e: React.FocusEvent<HTMLInputElement>) => void;
    onChange?: (e: React.ChangeEvent<HTMLInputElement>) => void;
    onFocus?: (e: React.FocusEvent<HTMLInputElement>) => void;
    onPaste?: (e: React.ClipboardEvent<HTMLInputElement>) => void;
    value?: string;
    children?: (inputProps: React.InputHTMLAttributes<HTMLInputElement>) => React.ReactElement;
    [key: string]: any;
  }
  
  declare const InputMask: React.FC<InputMaskProps>;
  
  export default InputMask;
}