import React from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

const Navbar = () => {
    const { user, login, logout } = useAuth();

    return (
        <header className="sticky top-0 z-50 bg-white/80 backdrop-blur-md border-b border-gray-200">
            <div className="w-full px-4 md:px-8 h-20 flex items-center justify-between">
                {}
                <div className="flex items-center gap-2">
                    <Link to="/" className="flex items-center gap-2">
                        <div className="w-8 h-8 bg-blue-600 rounded-lg flex items-center justify-center text-white font-bold text-lg shadow-sm">S</div>
                        <h1 className="text-xl font-bold text-gray-900 tracking-tight">Syd<span className="text-blue-600">Events</span></h1>
                    </Link>
                </div>

                {}
                <div className="flex items-center space-x-6">
                    <Link to="/" className="text-sm font-medium text-gray-700 hover:text-blue-600 transition-colors">Browse</Link>
                    {user ? (
                        <>
                            <Link to="/admin" className="text-sm font-medium text-gray-700 hover:text-blue-600 transition-colors">BackStage</Link>
                            <div className="flex items-center space-x-3 pl-4 border-l border-gray-200">
                                {user.photoURL && <img src={user.photoURL} alt="Profile" className="w-8 h-8 rounded-full border border-gray-200" />}
                                <button onClick={logout} className="text-sm font-medium text-red-500 hover:text-red-700 transition-colors">Logout</button>
                            </div>
                        </>
                    ) : (
                        <Link
                            to="/admin/login"
                            className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg text-sm font-medium  shadow-sm "
                        >
                            Admin Login
                        </Link>
                    )}
                </div>
            </div>
        </header>
    );
};

export default Navbar;
