import React, { useState } from 'react';
import { MapPin, ExternalLink, Clock, X, Mail } from 'lucide-react';
import { format } from 'date-fns';

const getGradient = (title) => {
    const gradients = [
        "from-blue-400 to-indigo-500",
        "from-emerald-400 to-teal-500",
        "from-orange-400 to-pink-500",
        "from-purple-400 to-indigo-600"
    ];
    const index = (title || "").length % gradients.length;
    return `bg-gradient-to-br ${gradients[index]}`;
};

const EventCard = ({ event }) => {
    // DEBUG EVENT DATES (temporary – remove after verification)
    console.log({
        title: event.title,
        start: event.startDate,
        end: event.endDate,
        next: event.nextOccurrence,
        today: new Date()
    });

    // Correct active / inactive logic
    const isActive = event.nextOccurrence
        ? new Date(event.nextOccurrence) >= new Date()
        : new Date(event.endDate) >= new Date();
    const [showModal, setShowModal] = useState(false);
    const [email, setEmail] = useState("");
    const [isSubmitting, setIsSubmitting] = useState(false);

    const handleFormSubmit = async (e) => {
        e.preventDefault();
        setIsSubmitting(true);

        await new Promise(resolve => setTimeout(resolve, 800));

        setIsSubmitting(false);
        setShowModal(false);

        window.open(event.sourceUrl, '_blank');
    };

    const renderDateTime = () => {
        if (!event.startDate) return "Date TBA";
        const start = new Date(event.startDate);
        const end = event.endDate ? new Date(event.endDate) : null;
        const dateStr = format(start, 'EEE, MMM d');
        const timeStr = format(start, 'h:mm a');

        if (end && format(start, 'yyyy-MM-dd') !== format(end, 'yyyy-MM-dd')) {
            return (
                <div className="flex flex-col leading-tight">
                    <span>{format(start, 'MMM d')} – {format(end, 'MMM d')}</span>
                    <span className="text-xs opacity-75 font-normal">{timeStr}</span>
                </div>
            );
        }
        return (
            <div className="flex flex-col leading-tight">
                <span>{dateStr}</span>
                <span className="text-xs opacity-75 font-normal">{timeStr}</span>
            </div>
        );
    };

    return (
        <>
            { }
            <div className={`bg-white rounded-xl shadow-sm hover:shadow-lg hover:-translate-y-1 transition-all duration-300 border border-gray-100 flex flex-col h-full overflow-hidden group relative ${!isActive ? 'opacity-60 grayscale' : ''}`}>

                { }
                <div className="h-48 w-full relative overflow-hidden">
                    {event.imageUrl ? (
                        <img
                            src={event.imageUrl}
                            alt={event.title}
                            className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105"
                        />
                    ) : (
                        <div className={`w-full h-full flex items-center justify-center ${getGradient(event.title)}`}>
                            <span className="text-white/40 font-bold text-2xl tracking-widest">SYD</span>
                        </div>
                    )}

                    <div className="absolute top-3 right-3 bg-white/95 backdrop-blur-sm px-3 py-2 rounded-lg text-xs font-bold shadow-md text-gray-800 border border-gray-100 z-10">
                        {renderDateTime()}
                    </div>
                </div>

                { }
                <div className="p-5 flex-1 flex flex-col">
                    <div className="flex items-center gap-1.5 text-xs font-bold text-indigo-600 uppercase tracking-wide mb-2">
                        <MapPin className="w-3.5 h-3.5" />
                        <span className="truncate">{event.venue}</span>
                    </div>

                    <h3 className="text-lg font-bold text-gray-900 leading-snug mb-2 line-clamp-2 h-12">
                        {event.title}
                    </h3>

                    <p className="text-sm text-gray-500 mb-4 line-clamp-2 flex-1">
                        {event.description}
                    </p>

                    <button
                        onClick={() => setShowModal(true)}
                        className="w-full py-2.5 bg-gray-900 hover:bg-gray-800 text-white rounded-lg font-medium text-sm transition-colors flex items-center justify-center gap-2"
                    >
                        Get Tickets
                        <ExternalLink className="w-3.5 h-3.5" />
                    </button>
                </div>
            </div>

            { }
            {showModal && (
                <div
                    className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4 animate-in fade-in duration-200"
                    onClick={() => setShowModal(false)}
                >
                    <div
                        className="bg-white rounded-2xl shadow-2xl w-full max-w-md overflow-hidden relative transform transition-all scale-100"
                        onClick={(e) => e.stopPropagation()}
                    >
                        { }
                        <button
                            onClick={() => setShowModal(false)}
                            className="absolute top-4 right-4 p-2 bg-gray-100 hover:bg-gray-200 rounded-full text-gray-500 hover:text-gray-900 transition-colors z-10"
                        >
                            <X className="w-5 h-5" />
                        </button>

                        { }
                        <div className={`h-32 w-full ${!event.imageUrl ? getGradient(event.title) : ''} relative`}>
                            {event.imageUrl && <img src={event.imageUrl} alt="" className="w-full h-full object-cover opacity-90" />}
                            <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent flex items-end p-6">
                                <h3 className="text-white font-bold text-xl leading-tight shadow-sm">{event.title}</h3>
                            </div>
                        </div>

                        { }
                        <div className="p-6 pt-6">
                            <div className="text-center mb-6">
                                <p className="text-gray-600 text-sm">
                                    You're one step away! Enter your email to unlock the official ticket link.
                                </p>
                            </div>

                            <form onSubmit={handleFormSubmit} className="space-y-4">
                                <div>
                                    <label className="block text-xs font-bold text-gray-700 uppercase mb-1 ml-1">Email Address</label>
                                    <div className="relative">
                                        <Mail className="absolute left-3 top-3 text-gray-400 w-5 h-5" />
                                        <input
                                            type="email"
                                            required
                                            placeholder="you@example.com"
                                            value={email}
                                            onChange={e => setEmail(e.target.value)}
                                            className="w-full pl-10 pr-4 py-3 bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none transition-all"
                                        />
                                    </div>
                                </div>

                                <div className="flex items-start gap-2 mb-4">
                                    <input type="checkbox" id="subscribe" className="mt-1 rounded border-gray-300 text-blue-600 focus:ring-blue-500" />
                                    <label htmlFor="subscribe" className="text-xs text-gray-500">
                                        I agree to share my email with the event organizers and subscribe to the Sydney Events newsletter.
                                    </label>
                                </div>

                                <button
                                    type="submit"
                                    disabled={isSubmitting}
                                    className="w-full py-3.5 bg-blue-600 hover:bg-blue-700 text-white rounded-xl font-bold text-sm shadow-lg shadow-blue-200 transition-all flex items-center justify-center gap-2"
                                >
                                    {isSubmitting ? 'Unlocking...' : 'Proceed to Tickets'}
                                    {!isSubmitting && <ExternalLink className="w-4 h-4" />}
                                </button>
                            </form>

                            <div className="mt-4 text-center">
                                <button onClick={() => setShowModal(false)} className="text-xs text-gray-400 hover:text-gray-600 font-medium">
                                    No thanks, take me back
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </>
    );
};

export default EventCard;