import { RequestHandler } from "express";
import { CartItem, CartResponse, Plant } from "@shared/api";
import { findPlantById } from "./plants";

// Simple in-memory cart storage (in production, use database with user sessions)
const carts: Map<string, CartItem[]> = new Map();

// Resolve plant details from in-memory dataset to work in serverless environments
const getPlantById = async (id: string): Promise<Plant | undefined> => {
  return findPlantById(id);
};

// Get cart contents
export const getCart: RequestHandler = (req, res) => {
  try {
    const sessionId = (req.headers["session-id"] as string) || "default";
    const cartItems = carts.get(sessionId) || [];

    const total = cartItems.reduce(
      (sum, item) => sum + item.plant.price * item.quantity,
      0,
    );
    const itemCount = cartItems.reduce((sum, item) => sum + item.quantity, 0);

    const response: CartResponse = {
      items: cartItems,
      total,
      itemCount,
    };

    res.json(response);
  } catch (error) {
    res.status(500).json({ message: "Error fetching cart", status: 500 });
  }
};

// Add item to cart
export const addToCart: RequestHandler = async (req, res) => {
  try {
    const { plantId, quantity = 1 } = req.body;
    const sessionId = (req.headers["session-id"] as string) || "default";

    if (!plantId) {
      return res
        .status(400)
        .json({ message: "Plant ID is required", status: 400 });
    }

    const plant = await getPlantById(plantId);
    if (!plant) {
      return res.status(404).json({ message: "Plant not found", status: 404 });
    }

    if (!plant.inStock || plant.stockQuantity < quantity) {
      return res
        .status(400)
        .json({ message: "Insufficient stock", status: 400 });
    }

    let cartItems = carts.get(sessionId) || [];
    const existingItemIndex = cartItems.findIndex(
      (item) => item.plantId === plantId,
    );

    if (existingItemIndex >= 0) {
      // Update existing item
      cartItems[existingItemIndex].quantity += quantity;
    } else {
      // Add new item
      const newItem: CartItem = {
        plantId,
        quantity,
        plant,
      };
      cartItems.push(newItem);
    }

    carts.set(sessionId, cartItems);

    const total = cartItems.reduce(
      (sum, item) => sum + item.plant.price * item.quantity,
      0,
    );
    const itemCount = cartItems.reduce((sum, item) => sum + item.quantity, 0);

    const response: CartResponse = {
      items: cartItems,
      total,
      itemCount,
    };

    res.json(response);
  } catch (error) {
    res.status(500).json({ message: "Error adding to cart", status: 500 });
  }
};

// Update cart item quantity
export const updateCartItem: RequestHandler = (req, res) => {
  try {
    const { plantId, quantity } = req.body;
    const sessionId = (req.headers["session-id"] as string) || "default";

    if (!plantId || quantity < 0) {
      return res
        .status(400)
        .json({ message: "Invalid plant ID or quantity", status: 400 });
    }

    let cartItems = carts.get(sessionId) || [];
    const itemIndex = cartItems.findIndex((item) => item.plantId === plantId);

    if (itemIndex === -1) {
      return res
        .status(404)
        .json({ message: "Item not found in cart", status: 404 });
    }

    if (quantity === 0) {
      // Remove item from cart
      cartItems.splice(itemIndex, 1);
    } else {
      // Update quantity
      cartItems[itemIndex].quantity = quantity;
    }

    carts.set(sessionId, cartItems);

    const total = cartItems.reduce(
      (sum, item) => sum + item.plant.price * item.quantity,
      0,
    );
    const itemCount = cartItems.reduce((sum, item) => sum + item.quantity, 0);

    const response: CartResponse = {
      items: cartItems,
      total,
      itemCount,
    };

    res.json(response);
  } catch (error) {
    res.status(500).json({ message: "Error updating cart", status: 500 });
  }
};

// Remove item from cart
export const removeFromCart: RequestHandler = (req, res) => {
  try {
    const { plantId } = req.params;
    const sessionId = (req.headers["session-id"] as string) || "default";

    let cartItems = carts.get(sessionId) || [];
    cartItems = cartItems.filter((item) => item.plantId !== plantId);
    carts.set(sessionId, cartItems);

    const total = cartItems.reduce(
      (sum, item) => sum + item.plant.price * item.quantity,
      0,
    );
    const itemCount = cartItems.reduce((sum, item) => sum + item.quantity, 0);

    const response: CartResponse = {
      items: cartItems,
      total,
      itemCount,
    };

    res.json(response);
  } catch (error) {
    res.status(500).json({ message: "Error removing from cart", status: 500 });
  }
};

// Clear cart
export const clearCart: RequestHandler = (req, res) => {
  try {
    const sessionId = (req.headers["session-id"] as string) || "default";
    carts.delete(sessionId);

    const response: CartResponse = {
      items: [],
      total: 0,
      itemCount: 0,
    };

    res.json(response);
  } catch (error) {
    res.status(500).json({ message: "Error clearing cart", status: 500 });
  }
};
