"use client";
import { useState, useEffect } from "react";
import axios from "axios";
import { v4 as uuidv4 } from "uuid";

export default function Home() {
  const [balance, setBalance] = useState(1000);
  const [betAmount, setBetAmount] = useState(10);
  const [autoBetAmount, setAutoBetAmount] = useState(10);
  const [publicSeed, setPublicSeed] = useState("");
  // Store the publicSeed used for the current roll for verification purposes.
  const [currentRollPublicSeed, setCurrentRollPublicSeed] = useState("");
  const [serverSeed, setServerSeed] = useState("");
  const [hash, setHash] = useState("");
  const [diceRoll, setDiceRoll] = useState(null);
  const [win, setWin] = useState(null);
  const [autoMode, setAutoMode] = useState(false);
  const [betCount, setBetCount] = useState(1);
  const [isManual, setIsManual] = useState(true);
  const [response, setResponse] = useState(null);
  const [allroles, setAllRoles] = useState([]);

  // NEW: Threshold for "Roll Over" approach (slider from 1 to 6)
  const [threshold, setThreshold] = useState(4);

  useEffect(() => {
    setPublicSeed(uuidv4());
  }, []);

  // Load balance from localStorage on component mount
  useEffect(() => {
    const storedBalance = localStorage.getItem("balance-dice");
    if (storedBalance) {
      setBalance(parseInt(storedBalance, 10));
    }
  }, []);

  // Save balance to localStorage whenever it changes
  useEffect(() => {
    localStorage.setItem("balance-dice", balance);
  }, [balance]);

  // Calculate win chance and multiplier based on threshold
  // Win chance for "dice >= threshold" is (7 - threshold) / 6
  const winChance = (7 - threshold) / 6;
  // Multiplier: inverse of win chance (ignoring house edge)
  const multiplier = (1 / winChance).toFixed(2);

  // Function to roll the dice
  const rollDice = async (amount) => {
    if (isNaN(amount) || amount <= 0) {
      alert("Invalid bet amount!");
      return;
    }
    if (amount > balance) {
      alert("Insufficient balance!");
      return;
    }
    try {
      // Save the current public seed for verification before making the request.
      setCurrentRollPublicSeed(publicSeed);

      // Request a dice roll from the server
      const response = await axios.post("https://new-dice-game-backend.onrender.com/roll", { publicSeed });
      const { dice, hash, serverSeed } = response.data;

      setDiceRoll(dice);
      setHash(hash);
      setServerSeed(serverSeed);
      setAllRoles([...allroles, dice]);

      // Compare dice value with our threshold
      if (dice >= threshold) {
        // Win: Add bet amount to balance
        setBalance((prev) => prev + amount);
        setWin(true);
      } else {
        // Lose: Subtract bet amount from balance
        setBalance((prev) => prev - amount);
        setWin(false);
      }

      // Generate a new public seed for the next roll
      setPublicSeed(uuidv4());
    } catch (error) {
      console.error("Error rolling dice:", error);
    }
  };

  // Function to handle auto-bets
  const startAutoRoll = () => {
    setAutoMode(true);
    let count = 0;
    const interval = setInterval(async () => {
      if (count >= betCount || balance <= 0) {
        clearInterval(interval);
        setAutoMode(false);
      } else {
        await rollDice(autoBetAmount);
        count++;
      }
    }, 2000);
  };

  // Function to verify dice roll authenticity
  const verifyRoll = async () => {
    try {
      // Use the public seed from the current roll for verification.
      const response = await axios.post("https://new-dice-game-backend.onrender.com/verify", {
        publicSeed: currentRollPublicSeed,
        serverSeed,
        originalHash: hash,
      });

      setResponse(response.data.valid ? "Roll is authentic ✅" : "Roll is tampered ❌");
    } catch (error) {
      console.error("Verification error:", error);
    }
  };

  // Calculate the filled percentage for the slider.
  // (threshold - min) / (max - min) * 100
  const sliderPercentage = ((threshold - 1) / (6 - 1)) * 100;

  // Inline style for the slider track with a dynamic linear gradient.
  const sliderStyle = {
    background: `linear-gradient(to right, red 0%, red ${sliderPercentage}%, green ${sliderPercentage}%, green 100%)`
  };

  return (
    <div className="flex flex-row bg-slate-700 h-screen w-full p-4">
      <div className="h-full w-full m-auto bg-gray-700 rounded-lg flex flex-row justify-between">
        {/* Left Section */}
        <div className="w-[30%] m-auto h-full rounded-l-lg flex flex-col gap-4 p-4 bg-gray-700">
          {/* Mode Selection Buttons (Manual / Auto) */}
          <div className="flex justify-between bg-gray-900 p-2 rounded-full h-16">
            <button
              className={`w-1/2 text-center py-2 rounded-full transition ${isManual ? "bg-gray-700 text-gray-400" : "text-white bg-gray-900"
                }`}
              onClick={() => setIsManual(true)}
            >
              Manual
            </button>
            <button
              className={`w-1/2 text-center py-2 rounded-full transition ${!isManual ? "bg-gray-700 text-gray-400" : "text-white bg-gray-900"
                }`}
              onClick={() => setIsManual(false)}
            >
              Auto
            </button>
          </div>

          {/* Manual Mode UI */}
          {isManual ? (
            <div className="mt-4 space-y-4">
              {/* Bet Amount Input */}
              <div>
                <div className="flex justify-between items-center">
                  <label className="block text-gray-300 text-sm">Bet Amount</label>
                  <span className="font-medium text-white">₹{balance}</span>
                </div>
                <div className="flex justify-between items-center bg-gray-800 p-1 rounded-lg">
                  <input
                    type="number"
                    className="w-[80%] bg-gray-900 p-2 text-white"
                    value={betAmount}
                    onChange={(e) => setBetAmount(parseInt(e.target.value))}
                    min="1"
                    max={balance}
                  />
                  <div className="flex gap-2 w-[20%] justify-evenly">
                    <button
                      className="text-white px-2 py-1 rounded-lg cursor-pointer"
                      onClick={() => setBetAmount(Math.max(1, Math.floor(betAmount / 2)))}
                    >
                      1/2
                    </button>
                    <button
                      className="text-white px-2 py-1 rounded-lg cursor-pointer"
                      onClick={() => setBetAmount(Math.min(balance, betAmount * 2))}
                    >
                      2X
                    </button>
                  </div>
                </div>
              </div>

              {/* Profit on Win */}
              <div className="flex justify-between items-center bg-gray-800 p-2 rounded-lg">
                <span className="text-gray-300 text-sm">Profit on Win</span>
                <span className="font-medium text-green-400">₹{isNaN(betAmount) ? 0 : betAmount}</span>
              </div>

              {/* Bet Button */}
              <button
                onClick={() => rollDice(betAmount)}
                className="w-full bg-green-400 py-3 text-black font-bold rounded-lg"
                disabled={autoMode}
              >
                Bet
              </button>

              {/* Response Message */}
              {response && <div className="text-center text-white my-4">{response}</div>}

              {/* Fairness Check Button */}
              <button
                onClick={verifyRoll}
                className="w-full bg-blue-500 py-3 mt-4 text-white font-bold rounded-lg"
              >
                Check Fairness
              </button>
            </div>
          ) : (
            // Auto Mode UI
            <div className="mt-4 space-y-4">
              <div>
                <label className="block text-gray-300 text-sm">Number of Bets:</label>
                <input
                  type="number"
                  className="w-full bg-gray-900 p-2 rounded-lg text-white"
                  value={betCount}
                  onChange={(e) => setBetCount(parseInt(e.target.value))}
                  min="1"
                  max="10"
                />
              </div>
              <div>
                <label className="block text-gray-300 text-sm">Bet Amount for Auto Mode:</label>
                <input
                  type="number"
                  className="w-full bg-gray-900 p-2 rounded-lg text-white"
                  value={autoBetAmount}
                  onChange={(e) => setAutoBetAmount(parseInt(e.target.value))}
                  min="1"
                  max={balance}
                />
              </div>
              <button
                onClick={startAutoRoll}
                className="w-full bg-green-400 py-3 text-white font-bold rounded-lg hover:bg-green-500"
              >
                Start Auto
              </button>
            </div>
          )}
        </div>

        {/* Right Section */}
        <div className="w-[70%] m-auto bg-gray-800 h-full rounded-r-lg flex flex-col items-center justify-center">

          {/* Slider & Info */}
          <div className="mt-8 w-[80%] flex flex-col items-center justify-between p-4 h-[100%]">
            <div className="w-full flex justify-end gap-2 items-center">
              {allroles.slice(-14).map((role, index) => (
                <span key={index} className="text-sm font-medium text-black rounded-full p-2 bg-green-400 w-12 flex justify-center items-center">{role}</span>
              ))}
            </div>
            <div className="w-full flex flex-col items-center justify-center">
              {/* Display Dice Roll Result */}
              {diceRoll !== null && (
                <div className={`text-4xl font-bold mb-3 ${win ? "text-green-400" : "text-red-400"}`}>
                  Dice: {diceRoll} → {win ? "You Won!" : "You Lost!"}
                </div>
              )}
              <div className="flex justify-between mt-1 w-full flex-col">
                <span className="flex justify-between w-full text-white px-6">
                  {[1, 2, 3, 4, 5, 6].map((num) => (
                    <span key={num} className="text-xs text-gray-300">
                      {num}
                    </span>
                  ))}
                </span>
                <div className="p-2 bg-gray-700 w-full flex justify-center items-center rounded-full">
                  <div className="w-full bg-gray-800 rounded-full flex justify-center items-center">
                    <input
                      type="range"
                      min="1"
                      max="6"
                      step="1"
                      value={threshold}
                      onChange={(e) => {
                        const newValue = parseInt(e.target.value);
                        // Prevent selecting 1: if 1 is chosen, set threshold to 2 instead.
                        setThreshold(newValue === 1 ? 2 : newValue);
                      }}
                      style={sliderStyle}
                      className="w-full h-2 rounded-lg appearance-none outline-none m-2 custom-range"
                      radius="none"
                    />
                  </div>
                </div>
              </div>
            </div>
            <div className="mt-4 w-full bg-gray-700 p-4 rounded-lg flex justify-between items-center text-white">
              {/* Multiplier */}
              <div className="flex flex-col w-1/3 px-2">
                <span className="text-xs text-gray-400 tracking-wider">Multiplier</span>
                <span className="text-lg rounded-sm p-1 px-3 font-medium text-white bg-gray-800">{multiplier}</span>
              </div>

              {/* Roll Over */}
              <div className="flex flex-col w-1/3 px-2">
                <span className="text-xs text-gray-400 tracking-wider">Roll Over</span>
                <span className="text-lg font-medium rounded-sm p-1 px-3 text-white bg-gray-800 ">{threshold}</span>
              </div>

              {/* Win Chance */}
              <div className="flex flex-col w-1/3 px-2">
                <span className="text-xs text-gray-400 tracking-wider">Win Chance</span>
                <span className="text-lg font-medium p-1 px-3 bg-gray-800 rounded-sm text-white">
                  {(winChance * 100).toFixed(2)}%
                </span>
              </div>
            </div>

          </div>
        </div>
      </div>
    </div>
  );
}
