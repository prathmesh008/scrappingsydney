import React, { useEffect, useState } from 'react';
import { useLocation } from 'react-router-dom';

const TelegramFloatingBtn = () => {
    const location = useLocation();
    const [isVisible, setIsVisible] = useState(false);

    useEffect(() => {
        // Hide on login page or admin login
        if (location.pathname.includes('/login')) {
            setIsVisible(false);
        } else {
            setIsVisible(true);
        }
    }, [location]);

    if (!isVisible) return null;

    return (
        <a
            href="https://t.me/SydneyGuide2026_bot"
            target="_blank"
            rel="noopener noreferrer"
            className="fixed bottom-6 right-6 z-50 group flex items-center justify-center"
            title="Chat with our AI Assistant"
        >
            {/* Pulsing Effect */}
            <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-blue-400 opacity-75 duration-1000"></span>

            {/* Button */}
            <div className="relative flex h-14 w-14 items-center justify-center rounded-full bg-[#0088cc] shadow-lg shadow-blue-500/50 transition-transform duration-300 hover:scale-110 hover:-translate-y-1">
                {/* Telegram Logo SVG */}
                <svg viewBox="0 0 24 24" className="h-8 w-8 fill-white" xmlns="http://www.w3.org/2000/svg">
                    <path d="M11.944 0A12 12 0 0 0 0 12a12 12 0 0 0 12 12 12 12 0 0 0 12-12A12 12 0 0 0 12 0a12 12 0 0 0-.056 0zm4.962 7.224c.1-.002.321.023.465.14a.506.506 0 0 1 .171.325c.016.093.036.306.02.472-.18 1.898-.962 6.502-1.36 8.627-.168.9-.499 1.201-.82 1.23-.696.065-1.225-.46-1.9-.902-1.056-.693-1.653-1.124-2.678-1.8-1.185-.78-.417-1.21.258-1.91.177-.184 3.247-2.977 3.307-3.23.007-.032.014-.15-.056-.212s-.174-.041-.249-.024c-.106.024-1.793 1.14-5.061 3.345-.48.33-.913.49-1.302.48-.428-.008-1.252-.241-1.865-.44-.752-.245-1.349-.374-1.297-.789.027-.216.325-.437.893-.663 3.498-1.524 5.83-2.529 6.998-3.014 3.332-1.386 4.025-1.627 4.476-1.635z" />
                </svg>
            </div>

            {/* Tooltip Label */}
            <span className="absolute right-16 mr-2 hidden rounded-md bg-gray-900 px-3 py-1.5 text-xs font-bold text-white shadow-md group-hover:block whitespace-nowrap">
                Ask AI Assistant
            </span>
        </a>
    );
};

export default TelegramFloatingBtn;
