//
//  ChatInputView.swift
//  cbc
//
//  Created by Christopher Celaya on 12/25/25.
//

import SwiftUI

struct ChatInputView: View {
    @Binding var text: String
    let onSend: () -> Void
    let isLoading: Bool

    var body: some View {
        HStack(spacing: 12) {
            TextField("Ask anything...", text: $text, axis: .vertical)
                .textFieldStyle(.plain)
                .font(.body)
                .foregroundColor(.white)
                .padding(12)
                .background(Color(hex: "1A1A1A"))
                .cornerRadius(20)
                .lineLimit(1...5)
                .disabled(isLoading)
                .onSubmit {
                    if !text.isEmpty && !isLoading {
                        onSend()
                    }
                }

            Button(action: onSend) {
                Image(systemName: isLoading ? "stop.circle.fill" : "arrow.up.circle.fill")
                    .font(.system(size: 32))
                    .foregroundColor(text.isEmpty ? Color(hex: "A0A0A0") : Color(hex: "0066FF"))
            }
            .disabled(text.isEmpty && !isLoading)
        }
        .padding(.horizontal, 16)
        .padding(.vertical, 12)
        .background(Color(hex: "0A0A0A"))
    }
}

#Preview {
    VStack {
        Spacer()
        ChatInputView(text: .constant(""), onSend: {}, isLoading: false)
    }
    .background(Color(hex: "0A0A0A"))
}
