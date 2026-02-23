declare module 'react-quill' {
    import * as React from 'react';

    export interface ReactQuillProps {
        bounds?: string | HTMLElement;
        children?: React.ReactElement;
        className?: string;
        defaultValue?: string | any[];
        formats?: string[];
        id?: string;
        modules?: any;
        onChange?(
            value: string,
            delta: any,
            source: 'user' | 'api' | 'silent',
            editor: any
        ): void;
        onChangeSelection?(
            selection: any,
            source: 'user' | 'api' | 'silent',
            editor: any
        ): void;
        onFocus?(
            selection: any,
            source: 'user' | 'api' | 'silent',
            editor: any
        ): void;
        onBlur?(
            previousSelection: any,
            source: 'user' | 'api' | 'silent',
            editor: any
        ): void;
        onKeyDown?: React.EventHandler<any>;
        onKeyPress?: React.EventHandler<any>;
        onKeyUp?: React.EventHandler<any>;
        placeholder?: string;
        preserveWhitespace?: boolean;
        readOnly?: boolean;
        scrollingContainer?: string | HTMLElement;
        style?: React.CSSProperties;
        tabIndex?: number;
        theme?: string;
        value?: string | any[];
    }

    export default class ReactQuill extends React.Component<ReactQuillProps> {
        focus(): void;
        blur(): void;
        getEditor(): any;
    }
} 
