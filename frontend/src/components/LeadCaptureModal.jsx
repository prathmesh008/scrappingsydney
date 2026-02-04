import React, { useState } from 'react';
import api from '../utils/api';
import { X, Mail, CheckCircle, Ticket } from 'lucide-react';

const LeadCaptureModal = ({ event, onClose }) => {
    const [email, setEmail] = useState('');
    const [consent, setConsent] = useState(false);
    const [isSubmitting, setIsSubmitting] = useState(false);

    if (!event) return null;

    const handleSubmit = async (e) => {
        e.preventDefault();
        if (!consent) return;

        setIsSubmitting(true);
        try {
            
            await api.post('/leads', {
                email,
                consent: true,
                eventId: event._id
            });

            window.location.href = event.sourceUrl;
            onClose(); 
        } catch (err) {
            console.error("Lead capture failed:", err);
            
            window.location.href = event.sourceUrl;
        } finally {
            setIsSubmitting(false);
        }
    };

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-200">
            <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md overflow-hidden relative transform transition-all scale-100 animate-in zoom-in-95 duration-200">
                {}
                <button
                    onClick={onClose}
                    className="absolute top-4 right-4 p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-full transition-colors"
                >
                    <X className="w-5 h-5" />
                </button>

                {}
                <div className="h-32 bg-gray-900 relative">
                    {event.imageUrl ? (
                        <>
                            <img src={event.imageUrl} alt="" className="w-full h-full object-cover opacity-60" />
                            <div className="absolute inset-0 bg-gradient-to-t from-gray-900/90 to-transparent" />
                        </>
                    ) : (
                        <div className="w-full h-full bg-gradient-to-r from-blue-600 to-indigo-700 opacity-80" />
                    )}
                    <div className="absolute bottom-4 left-6 right-6">
                        <div className="inline-flex items-center gap-2 px-2.5 py-1 rounded-full bg-white/20 backdrop-blur-md text-white/90 text-[10px] font-bold uppercase tracking-wider mb-2">
                            <Ticket className="w-3 h-3" />
                            Get Tickets
                        </div>
                        <h3 className="text-white text-xl font-bold leading-tight line-clamp-1">{event.title}</h3>
                    </div>
                </div>

                {}
                <div className="p-6">
                    <p className="text-sm text-gray-600 mb-6">
                        You're one step away! Enter your email to proceed to the official ticket page.
                    </p>

                    <form onSubmit={handleSubmit} className="space-y-4">
                        <div className="space-y-1.5">
                            <label htmlFor="email" className="block text-sm font-semibold text-gray-700">Email Address</label>
                            <div className="relative">
                                <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                                <input
                                    type="email"
                                    id="email"
                                    required
                                    value={email}
                                    onChange={(e) => setEmail(e.target.value)}
                                    placeholder="you@example.com"
                                    className="w-full pl-10 pr-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition-all placeholder:text-gray-400"
                                />
                            </div>
                        </div>

                        <div className="flex items-start gap-3 p-3 bg-gray-50 rounded-lg border border-gray-100">
                            <input
                                type="checkbox"
                                id="consent"
                                required
                                checked={consent}
                                onChange={(e) => setConsent(e.target.checked)}
                                className="mt-1 w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500 cursor-pointer"
                            />
                            <label htmlFor="consent" className="text-xs text-gray-500 cursor-pointer">
                                I agree to share my email with the event organizers and subscribe to the Sydney Events newsletter.
                            </label>
                        </div>

                        <button
                            type="submit"
                            disabled={!consent || isSubmitting}
                            className="w-full py-3 px-4 bg-gray-900 hover:bg-black text-white font-bold rounded-xl shadow-lg hover:shadow-xl transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2 mt-4"
                        >
                            {isSubmitting ? (
                                <>
                                    <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                                    Redirecting...
                                </>
                            ) : (
                                <>
                                    Proceed to Tickets
                                    <CheckCircle className="w-4 h-4" />
                                </>
                            )}
                        </button>
                    </form>
                </div>
            </div>
        </div>
    );
};

export default LeadCaptureModal;
