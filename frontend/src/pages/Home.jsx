import React, { useState, useEffect, useMemo } from 'react';
import api from '../utils/api';
import { Link } from 'react-router-dom';
import { MapPin, Calendar, ArrowRight, Search, X, Instagram, Twitter, Facebook, Mail, Ticket, CheckCircle, Loader } from 'lucide-react';
import { format, isSameDay, isWithinInterval, nextSaturday, nextSunday, isAfter, isBefore } from 'date-fns';

// --- HELPER: Consistent Blue Gradient ---
const getGradient = () => "bg-gradient-to-br from-blue-600 to-blue-400";

const Home = () => {
    const [events, setEvents] = useState([]);
    const [loading, setLoading] = useState(true);
    const [searchTerm, setSearchTerm] = useState("");
    const [activeFilter, setActiveFilter] = useState("all");

    const [selectedEvent, setSelectedEvent] = useState(null);
    const [email, setEmail] = useState("");
    const [consent, setConsent] = useState(false);
    const [submitting, setSubmitting] = useState(false);

    useEffect(() => {
        const fetchEvents = async () => {
            try {
                const res = await api.get('/events');
                const liveEvents = res.data.filter(e => e.status === 'imported');
                setEvents(liveEvents);
            } catch (err) {
                console.error("Failed to fetch events", err);
            } finally {
                setLoading(false);
            }
        };
        fetchEvents();
    }, []);

    const handleCardClick = (event) => {
        setSelectedEvent(event);
        setEmail("");
        setConsent(false);
        setSubmitting(false);
    };

    const handleGetTickets = async (e) => {
        e.preventDefault();
        if (!email || !selectedEvent) return;
        if (!consent) {
            alert("Please agree to the terms to proceed.");
            return;
        }

        setSubmitting(true);
        try {
            // 1. Save Lead to DB
            await api.post('/leads', {
                email,
                consent: consent,
                eventId: selectedEvent._id
            });

            // 2. Redirect to Real Ticket Source
            window.open(selectedEvent.sourceUrl, '_blank');

            // 3. Close Modal
            setSelectedEvent(null);
        } catch (err) {
            console.error("Lead Error:", err);
            // Fallback: Redirect anyway if DB fails
            window.open(selectedEvent.sourceUrl, '_blank');
            setSelectedEvent(null);
        } finally {
            setSubmitting(false);
        }
    };

    // --- FILTER LOGIC ---
    const filteredEvents = useMemo(() => {
        let data = events;
        const now = new Date();

        if (searchTerm) {
            const lower = searchTerm.toLowerCase();
            data = data.filter(e =>
                e.title.toLowerCase().includes(lower) ||
                e.venue?.toLowerCase().includes(lower) ||
                e.description?.toLowerCase().includes(lower)
            );
        }

        if (activeFilter === 'today') {
            data = data.filter(e => {
                const start = new Date(e.startDate);
                const end = new Date(e.endDate || e.startDate);
                return isWithinInterval(now, { start, end }) || isSameDay(start, now);
            });
        }
        else if (activeFilter === 'weekend') {
            const saturday = nextSaturday(now);
            const sunday = nextSunday(now);
            sunday.setHours(23, 59, 59, 999);
            data = data.filter(e => {
                const start = new Date(e.startDate);
                const end = new Date(e.endDate || e.startDate);
                return (isBefore(start, sunday) && isAfter(end, saturday));
            });
        }

        return data.sort((a, b) => new Date(a.startDate) - new Date(b.startDate));
    }, [events, searchTerm, activeFilter]);

    return (
        <div className="min-h-screen bg-white flex flex-col">

            {/* --- HERO SECTION --- */}
            <div className="relative pt-32 pb-24 overflow-hidden">
                <div className="absolute inset-0 z-0">
                    <img
                        src="https://images.unsplash.com/photo-1506973035872-a4ec16b8e8d9?auto=format&fit=crop&w=2000&q=80"
                        alt="Sydney Harbour"
                        className="w-full h-full object-cover"
                    />
                    <div className="absolute inset-0 bg-gray-900/60 backdrop-blur-[2px]"></div>
                </div>

                <div className="relative z-10 text-center max-w-4xl mx-auto px-6">
                    <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-white/20 border border-white/30 text-white text-xs font-bold uppercase tracking-widest mb-6 backdrop-blur-md">
                        <MapPin className="w-3 h-3" /> Sydney, NSW
                    </div>
                    <h1 className="text-6xl font-black text-white tracking-tight mb-4 leading-tight drop-shadow-lg">
                        Experience Sydney,<br />
                        <span className="text-transparent bg-clip-text bg-gradient-to-r from-blue-300 to-white">
                            One Event at a Time
                        </span>
                    </h1>

                    <p className="text-lg text-gray-200 mb-10 leading-relaxed max-w-xl mx-auto drop-shadow-md font-medium">
                        From rooftop jazz in The Rocks to beachside markets in Bondi. Discover the local culture that makes our harbour city come alive.
                    </p>

                    {/* Search Bar */}
                    <div className="relative max-w-lg mx-auto mb-8">
                        <div className="relative flex items-center bg-white rounded-full shadow-2xl p-2 transform transition-transform focus-within:scale-105">
                            <Search className="w-5 h-5 text-gray-400 ml-4" />
                            <input
                                type="text"
                                placeholder="Search by suburb, venue, or vibe..."
                                className="flex-1 ml-3 outline-none text-gray-700 placeholder-gray-400 bg-transparent"
                                value={searchTerm}
                                onChange={(e) => setSearchTerm(e.target.value)}
                            />
                            {searchTerm && (
                                <button onClick={() => setSearchTerm('')} className="p-2 hover:bg-gray-100 rounded-full mr-1">
                                    <X className="w-4 h-4 text-gray-400" />
                                </button>
                            )}
                        </div>
                    </div>

                    {/* Filter Pills */}
                    <div className="flex flex-wrap justify-center gap-3">
                        {['All Events', 'Today', 'This Weekend'].map((label) => {
                            const value = label === 'All Events' ? 'all' : label === 'Today' ? 'today' : 'weekend';
                            const isActive = activeFilter === value;
                            return (
                                <button
                                    key={value}
                                    onClick={() => setActiveFilter(value)}
                                    className={`px-6 py-2.5 rounded-full text-sm font-bold transition-all duration-300 ${isActive
                                        ? 'bg-white text-blue-600 shadow-[0_0_20px_rgba(255,255,255,0.4)] scale-105'
                                        : 'bg-black/30 text-white border border-white/20 hover:bg-white/20 hover:border-white/50 backdrop-blur-md'
                                        }`}
                                >
                                    {label}
                                </button>
                            )
                        })}
                    </div>
                </div>
            </div>

            {/* --- EVENTS GRID --- */}
            <div className="w-full px-6 lg:px-[150px] py-20 bg-gray-50/50 flex-1">
                <div className="flex justify-between items-end mb-10 border-b border-gray-200 pb-4">
                    <div>
                        <h2 className="text-3xl font-black text-gray-900 tracking-tight">What's On in Sydney</h2>
                        <p className="text-gray-500 mt-2 font-medium">Found {filteredEvents.length} events happening soon.</p>
                    </div>
                </div>

                {loading ? (
                    <div className="text-center py-20 text-gray-400">Loading events...</div>
                ) : filteredEvents.length === 0 ? (
                    <div className="text-center py-20 bg-white rounded-3xl border border-dashed border-gray-200 shadow-sm">
                        <p className="text-gray-500 font-medium text-lg">No events found matching your search.</p>
                        <button onClick={() => { setSearchTerm(''); setActiveFilter('all'); }} className="mt-4 text-blue-600 font-bold hover:underline">Clear Filters</button>
                    </div>
                ) : (
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8">
                        {filteredEvents.map(event => (
                            <div
                                key={event._id}
                                onClick={() => handleCardClick(event)}
                                className="group bg-white rounded-3xl overflow-hidden hover:-translate-y-2 transition-all duration-500 shadow-[0_0_7px_rgba(0,0,0,0.3)] hover:shadow-[0_0_20px_rgba(0,0,0,0.4)] flex flex-col h-full border border-gray-100/50 cursor-pointer"
                            >
                                <div className={`h-56 relative overflow-hidden ${!event.imageUrl ? getGradient() : ''}`}>
                                    {event.imageUrl && (
                                        <img
                                            src={event.imageUrl}
                                            alt={event.title}
                                            className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-110"
                                        />
                                    )}
                                    <div className="absolute top-4 right-4 bg-white/90 backdrop-blur-md px-3 py-1.5 rounded-lg text-xs font-bold text-gray-900 shadow-lg">
                                        {format(new Date(event.startDate), 'MMM d')}
                                    </div>
                                    {event.endDate && !isSameDay(new Date(event.startDate), new Date(event.endDate)) && (
                                        <div className="absolute top-4 left-4 bg-blue-600/90 backdrop-blur-md text-white px-3 py-1.5 rounded-lg text-[10px] font-bold shadow-lg uppercase tracking-wide">
                                            Multi-Day
                                        </div>
                                    )}
                                </div>
                                {event.endDate && !isSameDay(new Date(event.startDate), new Date(event.endDate)) && (
                                    <div className="absolute top-4 left-4 bg-blue-600/90 backdrop-blur-md text-white px-3 py-1.5 rounded-lg text-[10px] font-bold shadow-lg uppercase tracking-wide">
                                        Multi-Day
                                    </div>
                                )}

                                <div className="p-6 flex-1 flex flex-col">
                                    <div className="flex items-center gap-2 mb-3">
                                        <span className={`inline-flex items-center px-2.5 py-1 rounded-full text-[10px] font-bold uppercase tracking-wide ${event.source === 'EventFinda'
                                            ? 'bg-orange-100 text-orange-700'
                                            : event.source === 'WhatsOn'
                                                ? 'bg-blue-100 text-blue-700'
                                                : 'bg-gray-100 text-gray-700'
                                            }`}>
                                            {event.source || 'External'}
                                        </span>
                                    </div>
                                    <div className="flex items-center gap-2.5 mb-3 text-xs font-bold text-blue-600 uppercase tracking-wide">
                                        <MapPin className="w-3.5 h-3.5" />
                                        <span className="truncate max-w-[200px]">{event.venue}</span>
                                    </div>

                                    <h3 className="text-xl font-bold text-gray-900 leading-snug mb-3 group-hover:text-blue-600 transition-colors line-clamp-2">
                                        {event.title}
                                    </h3>

                                    <p className="text-sm text-gray-500 line-clamp-2 mb-6 flex-1 leading-relaxed">
                                        {event.description}
                                    </p>

                                    <div className="pt-5 border-t border-gray-100 flex justify-between items-center">
                                        <span className="text-xs font-bold text-gray-400 uppercase tracking-wide">
                                            {format(new Date(event.startDate), 'EEE, h:mm a')}
                                        </span>
                                        <span className="text-sm font-bold text-blue-600 flex items-center gap-1 group-hover:translate-x-1 transition-transform bg-blue-50 px-3 py-1 rounded-full">
                                            Get Tickets <ArrowRight className="w-3.5 h-3.5" />
                                        </span>
                                    </div>
                                </div>
                            </div>
                        ))}
                    </div>
                )}
            </div>

            {/* --- LEAD CAPTURE MODAL (MATCHING SCREENSHOT) --- */}
            {selectedEvent && (
                <div
                    className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-gray-900/70 backdrop-blur-sm animate-in fade-in duration-200"
                    onClick={() => setSelectedEvent(null)} // 👈 THIS IS THE FIX
                >
                    <div
                        className="bg-white w-full max-w-md rounded-2xl shadow-2xl overflow-hidden relative animate-in zoom-in-95 duration-300"
                        onClick={(e) => e.stopPropagation()} // Prevents closing when clicking inside
                    >
                        {/* Header */}
                        <div className="h-32 w-full relative">
                            {selectedEvent.imageUrl ? (
                                <img src={selectedEvent.imageUrl} alt="" className="w-full h-full object-cover" />
                            ) : (
                                <div className={`w-full h-full ${getGradient()}`}></div>
                            )}
                            <div className="absolute inset-0 bg-gradient-to-t from-black/90 to-transparent"></div>

                            <div className="absolute top-4 left-4 flex items-center gap-1 bg-white/20 backdrop-blur-md border border-white/20 text-white px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider">
                                <Ticket className="w-3 h-3" /> Get Tickets
                            </div>

                            <button
                                onClick={() => setSelectedEvent(null)}
                                className="absolute top-4 right-4 p-1.5 bg-black/40 hover:bg-black/60 text-white rounded-full transition-colors"
                            >
                                <X className="w-4 h-4" />
                            </button>

                            <div className="absolute bottom-4 left-6 right-6">
                                <h3 className="text-xl font-bold text-white leading-tight line-clamp-1 shadow-sm">
                                    {selectedEvent.title}
                                </h3>
                            </div>
                        </div>

                        {/* Body */}
                        <div className="p-6">
                            <p className="text-sm text-gray-600 mb-5 leading-relaxed">
                                You're one step away! Enter your email to proceed to the official ticket page.
                            </p>

                            <form onSubmit={handleGetTickets} className="flex flex-col gap-4">
                                <div>
                                    <label className="block text-xs font-bold text-gray-700 uppercase mb-1.5">
                                        Email Address
                                    </label>
                                    <input
                                        type="email"
                                        required
                                        placeholder="you@example.com"
                                        className="w-full p-3 bg-white border border-gray-300 rounded-lg text-gray-900 text-sm focus:ring-2 focus:ring-gray-900 focus:border-gray-900 outline-none transition-all placeholder-gray-400"
                                        value={email}
                                        onChange={(e) => setEmail(e.target.value)}
                                    />
                                </div>

                                <div className="flex items-start gap-3">
                                    <input
                                        type="checkbox"
                                        id="consent"
                                        className="mt-1 w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500 cursor-pointer"
                                        checked={consent}
                                        onChange={(e) => setConsent(e.target.checked)}
                                    />
                                    <label htmlFor="consent" className="text-xs text-gray-500 leading-snug cursor-pointer">
                                        I agree to share my email with the event organizers and subscribe to the Sydney Events newsletter.
                                    </label>
                                </div>

                                <button
                                    type="submit"
                                    disabled={submitting}
                                    className="w-full py-3 bg-gray-900 hover:bg-black text-white font-bold rounded-lg shadow-lg transition-all flex items-center justify-center gap-2 mt-2 disabled:opacity-70 disabled:cursor-not-allowed"
                                >
                                    {submitting ? (
                                        <>Redirecting... <Loader className="w-4 h-4 animate-spin" /></>
                                    ) : (
                                        <>Proceed to Tickets <CheckCircle className="w-4 h-4" /></>
                                    )}
                                </button>
                            </form>
                        </div>
                    </div>
                </div>
            )}

            {/* --- FOOTER SECTION --- */}
            <footer className="bg-gray-900 text-white pt-16 pb-8 mt-auto">
                <div className="px-6 lg:px-[150px]">
                    <div className="grid grid-cols-1 md:grid-cols-4 gap-12 mb-12 border-b border-gray-800 pb-12">
                        <div className="col-span-1 md:col-span-2">
                            <h2 className="text-2xl font-black tracking-tighter text-white mb-4">SydEvents</h2>
                            <p className="text-gray-400 text-sm leading-relaxed max-w-sm mb-6">
                                The ultimate guide to discovering what's happening in Sydney.
                            </p>
                            <div className="flex gap-4">
                                <a href="#" className="w-10 h-10 rounded-full bg-gray-800 flex items-center justify-center hover:bg-blue-600 transition-colors"><Instagram className="w-5 h-5" /></a>
                                <a href="#" className="w-10 h-10 rounded-full bg-gray-800 flex items-center justify-center hover:bg-blue-600 transition-colors"><Twitter className="w-5 h-5" /></a>
                                <a href="#" className="w-10 h-10 rounded-full bg-gray-800 flex items-center justify-center hover:bg-blue-600 transition-colors"><Facebook className="w-5 h-5" /></a>
                            </div>
                        </div>
                        <div>
                            <h4 className="font-bold text-lg mb-6">Discover</h4>
                            <ul className="space-y-3 text-sm text-gray-400">
                                <li><a href="#" className="hover:text-white">All Events</a></li>
                                <li><a href="#" className="hover:text-white">Today's Picks</a></li>
                            </ul>
                        </div>
                        <div>
                            <h4 className="font-bold text-lg mb-6">Admin</h4>
                            <ul className="space-y-3 text-sm text-gray-400">
                                <li><Link to="/admin/login" className="hover:text-white">Admin Login</Link></li>
                                <li className="flex items-center gap-2 mt-4"><Mail className="w-4 h-4" /> support@sydevents.com</li>
                            </ul>
                        </div>
                    </div>
                    <div className="flex flex-col md:flex-row justify-between items-center pt-4 text-xs text-gray-500 font-medium">
                        <p>&copy; {new Date().getFullYear()} SydEvents. All rights reserved.</p>
                    </div>
                </div>
            </footer>
        </div>
    );
};

export default Home;